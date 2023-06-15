const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) =>{
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).sen({error: true, message: 'unauthorize access'});
  }
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
    if(err){
      return res.status(401).send({error: true, message: 'unauthorize access'})
    }
    req.decoded = decoded;
    next();
  })
}



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
    const userCollection = client.db("mindDB").collection("users");


    app.post('/jwt', (req, res) =>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

      res.send(token);
    })



    // user

    app.get('/users', async(req, res)=>{
      const result = await userCollection.find().toArray();
      res.send(result);
    })
    app.post('/users', async(req, res) =>{
      const user = req.body;
      const query = {email: user.email}
      const existingUser = await userCollection.findOne(query);
      if(existingUser){
        return res.send({message: 'user already exists'})
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    })

    app.patch('/users/admin/:id', async(req, res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updateUser ={
        $set: {
          userRole: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updateUser);
      res.send(result);
    })

    app.patch('/users/instructor/:id', async(req, res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updateUser ={
        $set: {
          userRole: 'instructor'
        }
      }
      const result = await userCollection.updateOne(filter, updateUser);
      res.send(result);
    })
    // classes
    app.get('/classes', async(req, res) =>{
        const result = await classCollection.find().toArray();
        res.send(result);
    })

    // enrolls
    app.get('/enrolls', verifyJWT, async(req, res)=>{
      const email = req.query.email;
      if(!email){
        res.send([])
      }

      const decodedEmail = req.decoded.email;
      if(email !== decodedEmail){
        return res.status(401).
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