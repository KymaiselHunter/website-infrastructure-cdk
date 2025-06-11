const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

exports.handler = async (event) => {
  const { fileName, fileType } = event.queryStringParameters || {};

  if (!fileName || !fileType) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing fileName or fileType" }),
    };
  }

  const bucket = process.env.UPLOAD_BUCKET;
  const key = `uploads/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: fileType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });

  return {
    statusCode: 200,
    body: JSON.stringify({ uploadUrl, key }),
    headers: { "Access-Control-Allow-Origin": "*" },
  };
};


// Optional Local test
if (require.main === module) {
process.env.UPLOAD_BUCKET = 'my-test-bucket'; // Replace with a real or dummy value

  const testEvent = {
    queryStringParameters: {
      fileName: 'test.jpg',
      fileType: 'image/jpeg',
    },
  };

  exports.handler(testEvent)
    .then((response) => {
      console.log('Lambda Response:', response);
    })
    .catch((err) => {
      console.error('Lambda Error:', err);
    });
}