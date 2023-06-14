const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1cvgdrp.mongodb.net/?retryWrites=true&w=majority`;

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

    const classCollection = client.db("mindDB").collection("classes");
    const enrollCollection = client.db("mindDB").collection("enrolls");


    app.get('/classes', async(req, res) =>{
        const result = await classCollection.find().toArray();
        res.send(result);
    })

    // enrolls
    app.get('/enrolls' , async(req, res)=>{
      const email = req.query.email;
      if(!email){
        res.send([])
      }
      const query = { email: email};
      const result = await enrollCollection.find(query).toArray();
      res.send(result);
    })


    app.post('/enrolls' , async(req, res)=>{
      const item = req.body;
      console.log(item);
      const result = await enrollCollection.insertOne(item);
      res.send(result);
    })

    app.delete('/enrolls/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await enrollCollection.deleteOne(query)
      res.send(result)
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res)=>{
    res.send('mindscape')
})

app.listen(port, () =>{
    console.log(`Mind ${port}`)
})