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
        const FrontendProduction = new cloudfront.Distribution(this, 'FrontendProduction', {
            defaultBehavior: {
                origin: new origins.S3Origin(websiteBucket, {
                    originAccessIdentity: oai,
                    originPath: '/production',
                }),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            defaultRootObject: 'index.html',
        });

        const FrontendMain = new cloudfront.Distribution(this, 'FrontendMain', {
            defaultBehavior: {
                origin: new origins.S3Origin(websiteBucket, {
                    originAccessIdentity: oai,
                    originPath: '/main'
                }),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            defaultRootObject: 'index.html',
        })

        // print url
        new cdk.CfnOutput(this, 'CloudFront_Main_Info', {
            description: 'Main Branch CloudFront Info',
            value: `Main URL: https://${FrontendMain.domainName} | ID: ${FrontendMain.distributionId}`,
        });

        new cdk.CfnOutput(this, 'CloudFront_Production_Info', {
            description: 'Production Branch CloudFront Info',
            value: `Production URL: https://${FrontendProduction.domainName} | ID: ${FrontendProduction.distributionId}`,
        });

    }
}