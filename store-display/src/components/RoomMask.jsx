/**

 * @file RoomMask.js

 * @description

 * A 2D Canvas overlay that renders the room image but punches a hole where the floor is.

 * This allows the 3D carpet (rendered below) to show through the floor, while furniture stays on top.

 */



import React, { useRef, useEffect } from "react";



export const RoomMask = ({ roomImgObj, maskImgObj, width, height }) => {

    const canvasRef = useRef();

   

    useEffect(() => {

        const canvas = canvasRef.current;

        const ctx = canvas.getContext("2d");

       

        canvas.width = width;

        canvas.height = height;



        ctx.clearRect(0,0,width,height);

       

        // 1. Draw Full Room (Base)

        ctx.drawImage(roomImgObj, 0, 0, width, height);

       

        // 2. Erase Floor (using mask with destination-out)

        // This is what allows the carpet to "hide" under furniture

        ctx.globalCompositeOperation = "destination-out";

        ctx.drawImage(maskImgObj, 0, 0, width, height);

       

        // 3. Reset

        ctx.globalCompositeOperation = "source-over";

    }, [roomImgObj, maskImgObj, width, height]);



    return (

        <canvas

            ref={canvasRef}

            style={{

                position:"absolute", top:0, left:0,

                width:"100%", height:"100%",

                pointerEvents:"none", zIndex: 20,

                objectFit: "contain"

            }}

        />

    );

};