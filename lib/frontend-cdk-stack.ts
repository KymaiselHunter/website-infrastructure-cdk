// basic aws and s3 imports
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from  'aws-cdk-lib/aws-s3';
import { RemovalPolicy } from 'aws-cdk-lib';
import { CfnIndex } from 'aws-cdk-lib/aws-kendra';

// cloud front and auth imports
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';

export class FrontendStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // s3 bucket for the static build itself
        const websiteBucket = new s3.Bucket(this, 'GwcWebsiteBucket', {
            bucketName: 'gwc-club-site', 

            publicReadAccess: false, //privititize for only cloudfront

            removalPolicy: RemovalPolicy.DESTROY, // delete on cdk destroy
            autoDeleteObjects: true,
        })

        new cdk.CfnOutput(this, 'websiteBucket name', {
            value: websiteBucket.bucketName,
        });

        // authorization for the s3 bucket
        const oai = new cloudfront.OriginAccessIdentity(this, 'FrontendOAI');

        websiteBucket.grantRead(oai);

        // distribution via cloudfront
        const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
            defaultBehavior: {
                origin: new origins.S3Origin(websiteBucket, {
                    originAccessIdentity: oai
                }),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            defaultRootObject: 'index.html',
        });

        // print url
        new cdk.CfnOutput(this, 'CloudFrontURL',{
            value: `https://${distribution.domainName}`,
        });
    }
}