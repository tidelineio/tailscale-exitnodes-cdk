import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface ExitNodeProps extends cdk.StackProps {
  tailscaleAuthKey: string,
  exitNodeName: string,
}

export class TailscaleExitnodesCdkStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props: ExitNodeProps) {
    super(scope, id, props);

    // aws ec2 describe-managed-prefix-lists --region ap-southeast-1 --filters Name=owner-id,Values=AWS Name=address-family,Values=IPv4
    // Find the IPv4 entry, e.g.,  `com.amazonaws.us-west-2.ec2-instance-connect`
    const regionToInstanceConnectPrefixList: Map<string, string> = new Map();
    regionToInstanceConnectPrefixList.set("ap-northeast-1", "pl-08d491d20eebc3b95");
    regionToInstanceConnectPrefixList.set("us-west-2", "pl-047d464325e7bf465");
    regionToInstanceConnectPrefixList.set("ap-southeast-1", "pl-073f7512b7b9a2450");

    const prefixListId = regionToInstanceConnectPrefixList.get(props.env!.region!)!;
    if (!prefixListId) {
      throw new Error(`Missing Instance Connect Prefix List for region ${props.env?.region}. Please update the list in the CDK stack.`)
    }

    // Create a VPC for our node to live in
    const vpc = new ec2.Vpc(this, 'TheVPC', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'tailscale',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ]
    })

    // Create a security group for EC2 Instance Connect
    const instanceConnectSG = new ec2.SecurityGroup(this, 'InstanceConnectSG', {
      vpc,
      description: 'Allow inbound SSH traffic for EC2 Instance Connect',
      allowAllOutbound: true,
    });

    // Allow inbound SSH (port 22) traffic from the managed prefix list
    instanceConnectSG.addIngressRule(
      ec2.Peer.prefixList(prefixListId),
      ec2.Port.tcp(22),
      'Allow SSH from EC2 Instance Connect'
    );
    
    // Drop our node into the public subnet to keep things simple (and save needing NAT!)
    const publicSubnets = vpc.selectSubnets({
      subnetType: ec2.SubnetType.PUBLIC
    });    
    
    const userData = ec2.UserData.forLinux()
    userData.addCommands(
      // Enable ip forwarding 
      "echo 'net.ipv4.ip_forward = 1' | sudo tee -a /etc/sysctl.conf",
      "echo 'net.ipv6.conf.all.forwarding = 1' | sudo tee -a /etc/sysctl.conf",
      "sysctl -p /etc/sysctl.conf",
      
      // Install TailScale (AL2)
      "yum -y install yum-utils",
      "yum-config-manager --add-repo https://pkgs.tailscale.com/stable/amazon-linux/2/tailscale.repo",
      "yum -y install tailscale",
      "systemctl enable --now tailscaled",
      `tailscale up --authkey ${props.tailscaleAuthKey} --advertise-exit-node --hostname=${props.exitNodeName}`
    );

    // Create our exit node
    const instance = new ec2.Instance(this, "exitNode", {      
      instanceType: new ec2.InstanceType("t4g.small"), // t3.micro, but we're using arm, so t4g.small or t4g.micro
      vpc: vpc,
      instanceName: props.exitNodeName,
      securityGroup: instanceConnectSG,
      vpcSubnets: publicSubnets,
      machineImage: ec2.MachineImage.latestAmazonLinux({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
        cpuType: ec2.AmazonLinuxCpuType.ARM_64,
      }),
      userData: userData
    });
  }

}

