#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { NewBmoStack } from '../lib/new-bmo-stack';
import { BMOPipelineStack } from '../lib/bmo-pipeline-stack';

const app = new cdk.App();

const prodAccount = process.env.CDK_DEFAULT_ACCOUNT;
const prodRegion = process.env.CDK_DEFAULT_REGION;

// new NewBmoStack(app, 'NewBmoStack', {
//     env: { account: prodAccount, region: prodRegion },
// });

new BMOPipelineStack(app, 'BMOPipelineStack', {
    env: { account: prodAccount, region: prodRegion },
});
