const AWS = require('aws-sdk');
const axios = require('axios');
const sharp = require('sharp')

const S3 = new AWS.S3()

//Get Bucket Name from the ENV Variables
const BUCKET_NAME = process.env.BUCKET_NAME || "";

module.exports.resizer = async (event, context) => {

  const { outputRoute, outputToken, inputS3Url } = event.getObjectContext || {};
  const requestedUrl = event['userRequest']['url']

  try {
    //Requested image already existing in S3
    const { data: requestedImage } = await axios.get(inputS3Url, { responseType: 'arraybuffer' })

    await S3.writeGetObjectResponse({
      RequestRoute: outputRoute,
      RequestToken: outputToken,
      Body: requestedImage
    }).promise()

    return {
      statusCode: 200
    }

  } catch (e) {
    //Requested image not existing in S3
    const objectRegex = /\/[^\/]+$/ //Used to extract the Object from the URL
    const sizeRegex = /(\d*x\d*)/   //Used to extract the size from the Object name 

    const requestedObject = requestedUrl.match(objectRegex)[0].replace("/", "") //e.g. richmond_720x480.jpg
    const requestedSize = requestedObject.match(sizeRegex)[0] //e.g. 720_480
    const [width, height] = requestedSize.split("x") //e.g. [720, 480]
    const fullSizeObject = requestedObject.replace(`_${requestedSize}`, "") //e.g. richmond.jpg
    const fullSizeURL = `https://${BUCKET_NAME}.s3.amazonaws.com/${fullSizeObject}`

    try {
      //Downloading full size image
      const { data: fullSizeImage } = await axios.get(fullSizeURL, { responseType: 'arraybuffer' })
      //Resizing full size image
      const resizedImage = await sharp(fullSizeImage).resize(parseInt(width), parseInt(height)).toBuffer()

      //Return the resized image to S3
      await S3.writeGetObjectResponse({
        RequestRoute: outputRoute,
        RequestToken: outputToken,
        Body: resizedImage,
      }).promise()

      //Uploading the resized image to S3
      await S3.upload({
        Bucket: BUCKET_NAME,
        Key: requestedObject,
        Body: resizedImage
      }).promise()

      return {
        statusCode: 200
      }

    } catch (e) {
      console.error("Error", e)
      return {
        statusCode: 500
      }
    }
  }
};