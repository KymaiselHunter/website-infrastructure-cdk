import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

import * as lambda from 'aws-cdk-lib/aws-lambda';

import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';

import { CfnOutput } from 'aws-cdk-lib';

export class WebsiteInfrastructureCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    // =====================
    // s3 Bucket
    new s3.Bucket(this, 'ImageGalleryBucket', {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    })

    // =====================
    // aws Lambda function
    const pingFunction = new lambda.Function(this, 'PingFunction',{
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler', 
      code: lambda.Code.fromAsset('lambdas/ping'),
      functionName: 'PingTestFunction', // Optional: added for clarity
    });

    // ================
    // aws API gateway
    // make an HTTP API
    const httpAPI = new apigatewayv2.HttpApi(this, 'ImageGalleryHttpApi',{
      apiName : 'ImageGalleryAPI',
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

    // print ping http url
    new CfnOutput(this, 'ImageGalleryHttpApiEndpoint', {
      value: httpAPI.url ?? 'No URL found',
      description: 'Base URL for the http api gateway',
    });
  }
}
