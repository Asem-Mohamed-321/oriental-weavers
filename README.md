# Oriental weaver project

An interactive showroom solution that allows customers to virtually "try on" carpets in their own homes. By combining a mobile controller with a large display, the system uses AI segmentation and Perspective Projection to overlay 3D carpet models onto 2D room photos with high realism.

## 📦 Setup Instructions

#### 1- Clone the repository:
```bash
git clone https://github.com/Asem-Mohamed-321/oriental-weavers
cd oriental-weavers
```

#### 2- Set the Back-end:
##### Navigate to the backend folder and install the required dependencies:
```bash
cd backend
pip install -r requirements.txt
```
##### Create a .env file for your email credentials:
```bash
# Mac/Linux
touch .env

# Windows (Command Prompt)
type nul > .env
```

##### Open the .env file and add your Gmail App Password configuration (do not use quotes):
```ini,
#email config
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=xxxx-yyyy-zzzz-wwww
```
###### > Note: For Gmail, you must use an App Password, not your regular login password. [Learn how to create one here](https://support.google.com/accounts/answer/185833).

##### start the server
```
py app.py
```

#### 3- Start the Display Screen (frontend):
```bash
cd store-display
npm install
npm run dev
```
#### 4-  Setup the Mobile Controller (Frontend):
```bash
cd front-end-design
npm install
npm run dev
```
#### 5- Connect your Phone
1. Ensure your phone and computer are connected to the same Wi-Fi network.
2. Find your computer's local IP address (e.g., 192.168.1.5).
3. Open your mobile browser and navigate to: http://[YOUR_IP]:5173.