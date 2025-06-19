# Tailscale exit nodes on AWS

This is a simple CDK stack that automates the provisioning of Tailscale exit nodes on AWS. It is 
decribed in more detail in [this blog post](blog.scottgerring.com/automating-tailscale-exit-nodes-on-aws/).

To use it, simply edit [bin/tailscale-exitnodes-cdk.ts](bin/tailscale-exitnodes-cdk.ts) to list the
regions you want to use:

```typescript
  stackForRegion('ExitNodesStackSydney', 'ap-southeast-2', "TSSydneyExitNode"),
  stackForRegion('ExitNodesStackZurich', 'eu-central-2', "TSZurichExitNode")
];
```

Next, set the environment variable `TAILSCALE_AUTH_KEY` to your tailscale auth key and deploy with `cdk deploy`.

## GitHub Actions Deployment

This project is configured to automatically deploy to AWS when changes are pushed to the `main` branch. To enable this, you need to configure the following secrets in your GitHub repository's settings:

*   `AWS_ACCESS_KEY_ID`: Your AWS access key ID.
*   `AWS_SECRET_ACCESS_KEY`: Your AWS secret access key.
*   `TAILSCALE_AUTH_KEY`: Your Tailscale auth key.

The GitHub Actions workflow will use these secrets to authenticate with AWS and Tailscale, and then run `cdk bootstrap` and `cdk deploy` to provision the resources.

> **Warning**
> This stack deploys EC2 instances and has cost implications!
