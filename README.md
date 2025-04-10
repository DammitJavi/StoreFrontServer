
For AWS EC2 Linux:

curl -sL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs


Login to AWS public ip.
ssh -i /path/to/my-key.pem ec2-user@<public-ip-or-dns>

sudo yum update -y

curl -sL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

sudo yum install git -y

Clone Repo: 
sudo yum install git -y https://github.com/DammitJavi/StoreFrontServer.git

npm install

Install PostgreSQL:
sudo yum install -y postgresql-server


//login to instance
ssh -i ~/.ssh/aws.pem ec2-user@<-Public IP->


//Login to PSQL instance
psql -h <-Public IP-> -U ec2-user -d postgres -p 5432 -W

AWS EC2 for server
AWS S3 for client


