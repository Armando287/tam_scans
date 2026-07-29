const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");

async function test(endpoint, bucket) {
  const client = new S3Client({
    region: "us-east-1",
    endpoint: endpoint,
    credentials: {
      accessKeyId: "HFAKRj7xdIkOwo7aem6JpbEfxp2PEId",
      secretAccessKey: "3c8b40a55e67f6da88068db3b1db6418f28d183b82635ae47ddc60101186e366"
    },
    forcePathStyle: true
  });
  
  try {
    const cmd = new ListObjectsV2Command({ Bucket: bucket });
    const res = await client.send(cmd);
    console.log(`SUCCESS for Endpoint: ${endpoint}, Bucket: ${bucket}`);
  } catch (err) {
    console.log(`ERROR for Endpoint: ${endpoint}, Bucket: ${bucket} => ${err.message}`);
  }
}

async function run() {
  await test("https://s3.hf.co/GPL12", "uploads");
  await test("https://s3.hf.co", "GPL12/uploads");
  await test("https://s3.hf.co", "uploads");
}
run();
