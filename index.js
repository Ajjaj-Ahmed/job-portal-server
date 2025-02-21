const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 5000
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(express.json())
app.use(cors())


console.log()

const uri = `mongodb+srv://${process.env.S3_BUCKET}:${process.env.SECRET_KEY}@cluster0.zrru5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {


  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const jobsCollection = client.db("jobPortal").collection("jobs")
    const jobApplicationCollection = client.db('jobPortal').collection('job_applications');

    app.get('/jobs', async (req, res) => {

      const email = req.query.email;
      let query = {};
      if (email) {
        query = { hr_email: email }
      }

      const cursor = jobsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result)
    })

    app.get('/jobs/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await jobsCollection.findOne(query);
      res.send(result);
    })

    // create job post
    app.post('/jobs', async (req, res) => {
      const newJob = req.body;
      const result = await jobsCollection.insertOne(newJob);
      res.send(result)
    })

    // get all jobs data by email
    app.get('/job-application', async (req, res) => {
      const email = req.query.email;
      const query = { applicant_email: email }
      const result = await jobApplicationCollection.find(query).toArray();

      // getting job information by id
      for (const applicaiton of result) {
        const query1 = { _id: new ObjectId(applicaiton.job_id) }
        const job = await jobsCollection.findOne(query1);
        if (job) {
          applicaiton.title = job.title;
          applicaiton.location = job.location;
          applicaiton.company = job.company;
          applicaiton.company_logo = job.company_logo;
        }
      }

      res.send(result)
    })

    // get job application by id
    app.get('/job-applications/jobs/:job_id', async (req, res) => {
      const jobId = req.params.job_id;
      const query = { job_id: jobId }
      const result = await jobApplicationCollection.find(query).toArray()
      res.send(result);
    })

    // job application api
    app.post('/job-applications', async (req, res) => {
      const applicaiton = req.body;
      const result = await jobApplicationCollection.insertOne(applicaiton);

      // get my id , how many apply my post
      const id = applicaiton.job_id;
      const query = { _id: new ObjectId(id) };
      const job = await jobsCollection.findOne(query);

      let newCount = 0;
      if (job.applicationCount) {
        newCount = job.applicationCount + 1;
      }
      else {
        newCount = 1;
      }
      // now update the job info
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          applicationCount: newCount
        }
      }

      const updateResult = await jobsCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })


  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})