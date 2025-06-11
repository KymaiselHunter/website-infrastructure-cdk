import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

import * as lambda from 'aws-cdk-lib/aws-lambda';

import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';

import { CfnOutput } from 'aws-cdk-lib';
import { LambdaDataSource } from 'aws-cdk-lib/aws-appsync';
import { LAMBDA_NODEJS_USE_LATEST_RUNTIME } from 'aws-cdk-lib/cx-api';

export class WebsiteInfrastructureCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    // =====================
    // s3 Bucket
    const imageBucket = new s3.Bucket(this, 'ImageGalleryBucket', {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    // DELETE AFTER DEVELOPMENT, ONLY ALLOW OUR DOMAIN
    imageBucket.addCorsRule({
      allowedOrigins: ['*'], // or ['http://localhost:5173'] for stricter dev
      allowedMethods: [s3.HttpMethods.PUT],
      allowedHeaders: ['*'],
    });


    // =====================
    // aws Lambda function

    // test ping func
    const pingFunction = new lambda.Function(this, 'PingFunction',{
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler', 
      code: lambda.Code.fromAsset('lambdas/ping'),
      functionName: 'PingTestFunction', // Optional: added for clarity
    });

    // put Image to s3 bucket func
    const presignFunction = new lambda.Function(this, 'PresignFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambdas/presign'),
      functionName: 'PresignUploadFunction', // Optional: added for clarity
      environment:{
        UPLOAD_BUCKET: imageBucket.bucketName,
      },
    });
    imageBucket.grantPut(presignFunction);

    // ================
    // aws API gateway
    // make an HTTP API
    const httpAPI = new apigatewayv2.HttpApi(this, 'ImageGalleryHttpApi',{
      apiName : 'ImageGalleryAPI',
      
      // DELETE AFTER DEVELOPMENT, ONLY ALLOW OUR DOMAIN
      corsPreflight: {
        allowOrigins: ['*'], // Was told this is temporary just for development
        allowMethods: [apigatewayv2.CorsHttpMethod.GET, apigatewayv2.CorsHttpMethod.OPTIONS],
        allowHeaders: ['Content-Type'],
      },
    });

    // connect lambda ping to API
    const pingIntegration = new integrations.HttpLambdaIntegration(
      'PingIntegration',
      pingFunction
    );

    httpAPI.addRoutes({
      path: '/pingTest',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: pingIntegration,
    });

    // connect lambda presign(s3 put) to api
    const presignIntegration = new integrations.HttpLambdaIntegration(
      'PresignIntegration',
      presignFunction
    );

    httpAPI.addRoutes({
      path: '/presign',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: presignIntegration,
    });

    // print ping http url
    new CfnOutput(this, 'ImageGalleryHttpApiEndpoint', {
      value: httpAPI.url ?? 'No URL found',
      description: 'Base URL for the http api gateway',
    });
  }
}
