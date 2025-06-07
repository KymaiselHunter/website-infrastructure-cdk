import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

import * as lambda from 'aws-cdk-lib/aws-lambda';

export class WebsiteInfrastructureCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    new s3.Bucket(this, 'ImageGalleryBucket', {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    })

    const pingFunction = new lambda.Function(this, 'PingFunction',{
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler', 
      code: lambda.Code.fromAsset('lambdas/ping'),
      functionName: 'PingTestFunction', // Optional: added for clarity
    });
  }
}
