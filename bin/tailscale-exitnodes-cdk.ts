#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { TailscaleExitnodesCdkStack, ExitNodeProps } from '../lib/tailscale-exitnodes-cdk-stack';

const app = new cdk.App();

const tailscaleAuthKey = process.env.TAILSCALE_AUTH_KEY!

const stackForRegion = function(id: string, region: string, exitNodeName: string) {
  return new TailscaleExitnodesCdkStack(app, id, {
    tailscaleAuthKey,
    exitNodeName,
    env: {
      region: region
    }
  })
}

const stacks = [
  stackForRegion('ExitNodesStackVirginia', 'us-east-1', "Virginia"),
  stackForRegion('ExitNodesStackOhio', 'us-east-2', "Ohio"),
  stackForRegion('ExitNodesStackOregon', 'us-west-2', "Oregon"),
  stackForRegion('ExitNodesStackLondon', 'eu-west-2', "London"),
  stackForRegion('ExitNodesStackSydney', 'ap-southeast-2', "Sydney")
];
