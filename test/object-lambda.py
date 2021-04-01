import boto3

s3 = boto3.client('s3')

print('Request Image resized by S3 Object Lambda:')
image = s3.get_object(
  Bucket='arn:aws:s3-object-lambda:REGION:ACCOUNT:accesspoint/BUCKET-AP',
  Key='richmond_720x480.jpg')["Body"]
with open('pictures/richmond_720x480.jpg','wb') as f:  
  for i in image._raw_stream:  
    f.write(i)
    f.close
print('Downloaded with Success')
