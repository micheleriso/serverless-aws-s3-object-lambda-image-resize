'use strict';

console.log('Loading function');

const AWS = require('aws-sdk');
const axios = require('axios');
const sharp = require('sharp')

AWS.config.update({region: 'us-east-1'});

const s3 = new AWS.S3({
  apiVersion: '2006-03-01'
});

const BUCKET = process.env.BUCKET_NAME || "";

module.exports.resizer = async (event, context) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    const objectContext = event['getObjectContext']
    const RequestRoute = objectContext['outputRoute']
    const RequestToken = objectContext['outputToken']
    const objectURL = objectContext['inputS3Url']
    const requestedUrl = event['userRequest']['url']
    
    const urlRegex = /\/[^\/]+$/
    const objectRegex = /(\d*x\d*)/
    const requestedObject = requestedUrl.match(urlRegex)[0]
    console.log("Requested Object", requestedObject)
    const requestedSize = requestedObject.match(objectRegex)[0]
    console.log("Requested Size", requestedSize)
    const [width, height] = requestedSize.split("x")
    
    const fullSizeObject = requestedObject.replace(`_${requestedSize}`, "")

    console.log("Width: ", width, "Height: ", height)
    
    console.log("Full Size Object: ", fullSizeObject)

    const fullSizeURL = `https://${BUCKET}.s3.amazonaws.com${fullSizeObject}`

    console.log("Full Size URL: ", fullSizeURL)

    const {data: fullSizeImage} = await axios.get(fullSizeURL, { responseType: 'arraybuffer'})

    console.log("Full Size Image Downloaded")

    let resizedImage = ""

    try{
      resizedImage = await sharp(fullSizeImage).resize(parseInt(width), parseInt(height)).toBuffer()
      console.log("Image resized with Success")
    }catch(e){
      console.error("Error while resizing", e)
    }

try{
    const res = await s3.writeGetObjectResponse({
      RequestRoute,
      RequestToken,
      Body: resizedImage,
      StatusCode: 200

    }).promise()

    console.log("Write Get Object SUCCESS", res)
}catch(e){
  console.error("WRITE GET OBJECT FAILED", e)
}

return {
  statusCode: 200
}
   
};
