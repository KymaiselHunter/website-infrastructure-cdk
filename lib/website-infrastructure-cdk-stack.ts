// generic aws and cdk stuff
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

// lambda and api gatewat stuff
import * as lambda from 'aws-cdk-lib/aws-lambda';

import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';

import { CfnOutput } from 'aws-cdk-lib';
import { LambdaDataSource } from 'aws-cdk-lib/aws-appsync';
import { LAMBDA_NODEJS_USE_LATEST_RUNTIME } from 'aws-cdk-lib/cx-api';

// rds database stuff
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';

import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { ResourceExplorer2 } from 'aws-sdk';

export class WebsiteInfrastructureCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    // =====================
    // s3 Bucket
    // initial instantation
    
    const imageBucket = new s3.Bucket(this, 'ImageGalleryBucket', {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });
    
    // const imageBucket = s3.Bucket.fromBucketName(
    //   this, 
    //   'ImageGalleryBucket', 
    //   'websiteinfrastructurecdks-imagegallerybucketaf87b9-9mvgeg2eixah',
    // );

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

    // =============
    // aws rds stuffs

    // all secutiry stuff
    // find defualt vps
    const vpc = ec2.Vpc.fromLookup(this, "DefaultVPC", {
      isDefault: true,
    });

    // create a secutiry group for MySql Access (firewall type-scrit)
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DBSecurityGroup', {
      vpc,
      allowAllOutbound: true,
    });

    // Allow inbound MySql traffic on port 3306 (dev only)
    dbSecurityGroup .addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2. Port.tcp(3306),
      'Allow public MySql (only for development)'
    );

    // now the actual icreation of the rds MySql Instance
    const dbInstance = new rds.DatabaseInstance(this, 'ImageGalleryDB', {
      engine: rds.DatabaseInstanceEngine.mysql({ version: rds.MysqlEngineVersion.VER_8_0_36}),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc, 
      vpcSubnets: {
        subnetType: ec2. SubnetType.PUBLIC, // make it connectable for development
      },
      publiclyAccessible: true, // allows to connect via workbench/CLI
      securityGroups: [dbSecurityGroup],
      credentials: rds.Credentials.fromGeneratedSecret('dbadmin'), // secrets manager auto handles this
      allocatedStorage: 20, // in gigabytes
      maxAllocatedStorage: 100, // upperbound scaling for starage
      backupRetention: Duration.days(7),
      multiAz: false,
      removalPolicy: RemovalPolicy.DESTROY,
      deletionProtection: false,
    });

    // prints to get link for rds database
    new cdk.CfnOutput(this, 'ImageGalleryDBEndpoint', {
      value: dbInstance.dbInstanceEndpointAddress,
    });

    new cdk.CfnOutput(this, 'ImageGalleryDBSecretArn', {
      value: dbInstance.secret!.secretArn,
    });

  }
}
