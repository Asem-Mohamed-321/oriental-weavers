import os
import socket
import io
import base64
import time
import qrcode
import threading
import numpy as np
import cv2
from flask import Flask, request, send_file, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
from PIL import Image
import uuid
import shutil
import torch
import torch.nn as nn
import torch.nn.functional as F
from transformers import SegformerImageProcessor, SegformerForSemanticSegmentation
from flask_mail import Mail, Message
from dotenv import load_dotenv

# -------------------------------------------------------------------------
# 1. SETUP
# -------------------------------------------------------------------------
print(f"\n\n{'='*40}")
print(f"🛑 SERVER STARTUP | PID: {os.getpid()} | TIME: {time.ctime()}")
print(f"{'='*40}\n\n")

# Load variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading', ping_timeout=120)

UPLOAD_FOLDER = 'static/uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024

# --- PROTOTYPE CONFIGURATION ---
# Pre-defined corners for sample rooms so users don't have to drag them manually.
# Format: [TopLeft, TopRight, BottomRight, BottomLeft] (0.0 - 1.0 percentage)
ROOM_CONFIGS = {
    "room1.jpg": [[0.2216,0.8117],[0.8606,0.8243],[1.0952,1.044],[-0.0967,1.1213]],
    "room2.webp": [[0.227,0.674],[0.7824,0.6647],[1.0068,0.88],[-0.0016,0.8723]],
    # Add more filenames here if you add more samples to static/prototypes/
}

# -------------------------------------------------------------------------
# 1.5 EMAIL CONFIGURATION
# -------------------------------------------------------------------------
# You must use a real email here. If using Gmail, you need an "App Password".



app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_USERNAME')

# Debugging: Check if it loaded (Optional - remove before deploying)
if not app.config['MAIL_USERNAME'] or not app.config['MAIL_PASSWORD']:
    print("⚠️ WARNING: Email credentials not found. Check your .env file.")

mail = Mail(app)

# -------------------------------------------------------------------------
# 2. AI MODEL LOADING (With Local Cache)
# -------------------------------------------------------------------------
AI_CACHE_DIR = './ai_cache' 
FLOOR_MODEL = "nvidia/segformer-b5-finetuned-ade-640-640"

try:
    print(f"🔹 Loading Floor AI...")
    floor_processor = SegformerImageProcessor.from_pretrained(FLOOR_MODEL, cache_dir=AI_CACHE_DIR)
    floor_model = SegformerForSemanticSegmentation.from_pretrained(FLOOR_MODEL, cache_dir=AI_CACHE_DIR)
    print("✅ Floor AI Ready.")
except Exception as e:
    print(f"❌ Floor AI Load Failed: {e}")
    floor_model = None

# -------------------------------------------------------------------------
# 3. UTILITIES
# -------------------------------------------------------------------------
def get_ip_address():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

def process_carpet_logic(image_bytes):
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None: return None
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    def order_points(pts):
        rect = np.zeros((4, 2), dtype="float32")
        s = pts.sum(axis=1)
        rect[0] = pts[np.argmin(s)]
        rect[2] = pts[np.argmax(s)]
        diff = np.diff(pts, axis=1)
        rect[1] = pts[np.argmin(diff)]
        rect[3] = pts[np.argmax(diff)]
        return rect

    blur_levels = [5, 7, 9, 11]
    found_points = None
    for blur in blur_levels:
        blurred = cv2.GaussianBlur(gray, (blur, blur), 0)
        edged = cv2.Canny(blurred, 30, 150)
        contours, _ = cv2.findContours(edged.copy(), cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        if not contours: continue
        contours = sorted(contours, key=cv2.contourArea, reverse=True)
        for c in contours[:5]:
            peri = cv2.arcLength(c, True)
            for eps in [0.02, 0.03, 0.04, 0.05]:
                approx = cv2.approxPolyDP(c, eps * peri, True)
                if len(approx) == 4:
                    found_points = approx
                    break
            if found_points is not None: break
        if found_points is not None: break

    if found_points is not None and len(found_points) == 4:
        points = found_points.reshape(4, 2)
        rect = order_points(points.astype("float32"))
        (tl, tr, br, bl) = rect
        widthA = np.sqrt(((br[0]-bl[0])**2) + ((br[1]-bl[1])**2))
        widthB = np.sqrt(((tr[0]-tl[0])**2) + ((tr[1]-tl[1])**2))
        maxWidth = max(int(widthA), int(widthB))
        heightA = np.sqrt(((tr[0]-br[0])**2) + ((tr[1]-br[1])**2))
        heightB = np.sqrt(((tl[0]-bl[0])**2) + ((tl[1]-bl[1])**2))
        maxHeight = max(int(heightA), int(heightB))
        dst = np.array([[0,0],[maxWidth-1,0],[maxWidth-1,maxHeight-1],[0,maxHeight-1]], dtype="float32")
        M = cv2.getPerspectiveTransform(rect, dst)
        final_view = cv2.warpPerspective(image, M, (maxWidth, maxHeight))
        _, buffer = cv2.imencode('.jpg', final_view)
        return io.BytesIO(buffer)
    else:
        return io.BytesIO(image_bytes)

# -------------------------------------------------------------------------
# 4. BACKGROUND AI WORKER
# -------------------------------------------------------------------------
def run_ai_background(filepath, target_room_id):
    with app.app_context():
        try:
            print(f"🧵 AI Thread Started for Room: {target_room_id}")
            with open(filepath, "rb") as f: image_bytes = f.read()
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            
            if floor_model:
                inputs = floor_processor(images=image, return_tensors="pt", size={"height": 1280, "width": 1280})
                with torch.no_grad(): outputs = floor_model(**inputs)
                logits = nn.functional.interpolate(outputs.logits, size=image.size[::-1], mode="bilinear", align_corners=False)
                probs = F.softmax(logits, dim=1)
                floor_probs = probs[0, 3, :, :].numpy()
                floor_probs = (floor_probs - 0.45) / (0.55 - 0.45)
                floor_probs = np.clip(floor_probs, 0, 1)
                alpha = (floor_probs * 255).astype(np.uint8)
                rgba = np.zeros((alpha.shape[0], alpha.shape[1], 4), dtype=np.uint8)
                rgba[:,:,0] = rgba[:,:,1] = rgba[:,:,2] = 255
                rgba[:,:,3] = alpha
                
                mask_filename = f"mask_{uuid.uuid4().hex[:8]}.png"
                mask_path = os.path.join(app.config['UPLOAD_FOLDER'], mask_filename)
                Image.fromarray(rgba).save(mask_path, 'PNG')
                
                timestamp = int(time.time())
                ip = get_ip_address()
                mask_url = f"http://{ip}:5000/static/uploads/{mask_filename}?t={timestamp}"
                
                print(f"✅ AI Mask Done. Sending to {target_room_id}")
                socketio.emit('mask_generated', {'maskUrl': mask_url}, to=target_room_id)
        except Exception as e:
            print(f"⚠️ AI Thread Error: {e}")

# -------------------------------------------------------------------------
# 5. SOCKET HANDLERS
# -------------------------------------------------------------------------

@socketio.on('connect')
def handle_connect():
    print(f"🟢 Client Connected: {request.sid}")

@socketio.on('screen_register')
def handle_screen_register():
    room_id = request.sid
    join_room(room_id)
    print(f"📺 Screen Registered. ID: {room_id}")
    
    qr = qrcode.QRCode(box_size=10, border=4)
    qr.add_data(room_id)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buf = io.BytesIO()
    img.save(buf)
    b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    qr_image_data = f"data:image/png;base64,{b64}"

    emit('screen_registered', {'qr_data': qr_image_data})

@socketio.on('mobile_join_room')
def handle_mobile_join(data):
    target_room = data.get('roomId')
    if target_room:
        join_room(target_room)
        print(f"📱 Mobile {request.sid} joined Room {target_room}")
        emit('screen_status', {'message': 'Mobile Connected!'}, to=target_room)

@socketio.on('notify_screen')
def handle_notify(data):
    target_screen = data.get('screenId')
    file_type = data.get('type') 
    url = data.get('url')
    
    # Optional: Forward corner data if it exists (for prototypes)
    corners = data.get('corners', None)

    if file_type == 'room':
        emit('room_uploaded', {'imageUrl': url, 'corners': corners}, to=target_screen)
    elif file_type == 'carpet':
        emit('carpet_uploaded', {'imageUrl': url}, to=target_screen)

# -------------------------------------------------------------------------
# 6. API & UPLOAD ROUTES
# -------------------------------------------------------------------------

@app.route('/upload', methods=['POST'])
def upload_file_generic():
    if 'file' not in request.files: return jsonify({'error': 'No file'}), 400
    
    file = request.files['file']
    filename = f"{uuid.uuid4().hex[:8]}_{file.filename}"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    is_room = request.form.get('isRoom') == 'true'
    is_carpet = request.form.get('isCarpet') == 'true'
    target_screen_id = request.form.get('screenId')

    # 1. CARPET LOGIC
    if is_carpet:
        print(f"✂️ Processing Carpet: {filename}")
        try:
            processed_io = process_carpet_logic(file.read())
            with open(filepath, "wb") as f: f.write(processed_io.getbuffer())
        except Exception as e:
            print(f"⚠️ Carpet processing failed: {e}, saving raw.")
            file.seek(0)
            file.save(filepath)
    else:
        # 2. ROOM LOGIC
        file.save(filepath)
    
    ip = get_ip_address()
    file_url = f"http://{ip}:5000/static/uploads/{filename}"
    
    # 3. AI LOGIC (Only for Room Uploads)
    if is_room and target_screen_id:
        print(f"🧠 Starting AI for Room -> {target_screen_id}")
        thread = threading.Thread(target=run_ai_background, args=(filepath, target_screen_id))
        thread.daemon = True
        thread.start()

    return jsonify({'url': file_url})


# --- PROTOTYPE ENDPOINTS ---

@app.route('/api/prototypes')
def get_prototypes():
    # Looks for 'static/prototypes' folder
    proto_dir = os.path.join(app.root_path, 'static', 'prototypes')
    if not os.path.exists(proto_dir):
        return jsonify([])

    files = os.listdir(proto_dir)
    rooms = []
    
    # Pair images with their masks
    for f in files:
        if f.endswith(('.jpg', '.jpeg', '.png', '.webp')) and '_mask' not in f:
            base_name = os.path.splitext(f)[0]
            mask_name = f"{base_name}_mask.png"
            
            # Check if mask exists
            if mask_name in files:
                ip = get_ip_address()
                rooms.append({
                    "id": base_name,
                    "image": f"http://{ip}:5000/static/prototypes/{f}",
                    "mask": f"http://{ip}:5000/static/prototypes/{mask_name}",
                    "filename": f,
                    "mask_filename": mask_name
                })
    return jsonify(rooms)

@app.route('/select-prototype', methods=['POST'])
def select_prototype():
    data = request.json
    filename = data.get('filename')
    mask_filename = data.get('mask_filename')
    target_screen_id = data.get('screenId') # IMPORTANT: Which screen to update?

    if not filename or not mask_filename or not target_screen_id:
        return jsonify({"error": "Missing data"}), 400

    # Paths
    proto_dir = os.path.join(app.root_path, 'static', 'prototypes')
    upload_dir = app.config['UPLOAD_FOLDER']
    
    # 1. Copy Room Image -> 'current_room.jpg'
    room_dest = f"proto_{uuid.uuid4().hex[:6]}.jpg"
    shutil.copy(
        os.path.join(proto_dir, filename), 
        os.path.join(upload_dir, room_dest)
    )
    
    # 2. Copy Mask Image -> 'current_mask.png'
    mask_dest = f"mask_{uuid.uuid4().hex[:6]}.png"
    shutil.copy(
        os.path.join(proto_dir, mask_filename), 
        os.path.join(upload_dir, mask_dest)
    )
    
    # 3. Prepare URLs
    timestamp = int(time.time())
    ip = get_ip_address()
    room_url = f"http://{ip}:5000/static/uploads/{room_dest}?t={timestamp}"
    mask_url = f"http://{ip}:5000/static/uploads/{mask_dest}?t={timestamp}"
    
    print(f"✅ Prototype Selected: {filename} -> {target_screen_id}")
    
    # 4. Get Pre-defined Corners
    default_corners = ROOM_CONFIGS.get(filename, None)

    # 5. Tell Screen: "Room is ready (with corners!)"
    socketio.emit('room_uploaded', {
        'imageUrl': room_url,
        'corners': default_corners
    }, to=target_screen_id)
    
    # 6. Tell Screen: "Mask is ready"
    # Wait a tiny bit to ensure the frontend has loaded the room image first
    def send_mask_later():
        time.sleep(0.5)
        socketio.emit('mask_generated', {'maskUrl': mask_url}, to=target_screen_id)
        
    thread = threading.Thread(target=send_mask_later)
    thread.start()

    return jsonify({"status": "success"})


# Route to serve images
@app.route('/static/uploads/<filename>')
def serve_uploads(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/static/prototypes/<filename>')
def serve_prototypes(filename):
    return send_from_directory(os.path.join(app.root_path, 'static', 'prototypes'), filename)

# -------------------------------------------------------------------------
# 7. EMAIL ROUTE (ADD THIS AT THE END BEFORE if __name__)
# -------------------------------------------------------------------------
@app.route('/send-email', methods=['POST'])
def send_email_with_image():
    data = request.json
    user_email = data.get('email')
    image_data = data.get('image') # Base64 string

    if not user_email or not image_data:
        return jsonify({"error": "Missing data"}), 400

    try:
        # 1. Decode Base64 Image
        # Remove header "data:image/png;base64," if present
        if "," in image_data:
            image_data = image_data.split(",")[1]
        
        image_bytes = base64.b64decode(image_data)

        # 2. Create Email
        msg = Message("النساجون الشرقيون : سجادتك في غرفتك", recipients=[user_email])
        msg.body = "إليك شكل السجادة في غرفتك ز استمتع !"
        
        # 3. Attach Image
        msg.attach("design.png", "image/png", image_bytes)

        # 4. Send
        mail.send(msg)
        print(f"📧 Email sent to {user_email}")
        return jsonify({"status": "success"})

    except Exception as e:
        print(f"❌ Email Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print("🚀 Starting Server...")
    socketio.run(app, host='0.0.0.0', port=5000, debug=False, use_reloader=False)