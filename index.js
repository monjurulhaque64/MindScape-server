const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
require('dotenv').config();
const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorize access' });
  }
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorize access' });
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


    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

      res.send(token);
    })

    // verify admin 
    // const verifyAdmin = async (req, res, next) => {
    //   const email = req.decoded.email;
    //   const query = { email: email }
    //   const user = await userCollection.findOne(query);
    //   if (user?.role !== 'admin') {
    //     return res.status(403).send({ error: true, message: 'forbidden message' });
    //   }
    //   next();
    // }

    // verify instructor
    // const verifyInstructor = async (req, res, next) => {
    //   const email = req.decoded.email;
    //   const query = { email: email }
    //   const user = await userCollection.findOne(query);
    //   if (user?.role !== 'instructor') {
    //     return res.status(403).send({ error: true, message: 'forbidden message' });
    //   }
    //   next();
    // }



    // user

    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    })
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    })

    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        return res.send({ admin: false });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { admin: user?.userRole === 'admin' };
      res.send(result);
    });

    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        return res.send({ instructor: false });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { instructor: user?.userRole === 'instructor' };
      res.send(result);
    });

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateUser = {
        $set: {
          userRole: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updateUser);
      res.send(result);
    })

    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateUser = {
        $set: {
          userRole: 'instructor'
        }
      }
      const result = await userCollection.updateOne(filter, updateUser);
      res.send(result);
    })


    // classes
    app.get('/classes', async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    })

    app.get('/classes/instructor/:id', async (req, res) => {
      const id = req.params.id;
      try {
        const query = { _id: new ObjectId(id) };
        const options = {
          projection: {
            _id: 1,
            name: 1,
            instructorName: 1,
            instructorEmail: 1,
            availableSeats: 1,
            price: 1
          }
        };
        const result = await classCollection.findOne(query, options);

        if (result) {
          res.send(result);
        } else {
          res.status(404).send({ error: true, message: 'Class not found' });
        }
      } catch (error) {
        res.status(500).send({ error: true, message: 'Internal server error' });
      }
    });

    app.patch('/classes/instructor/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const option = { upsert: true };
      const classData = req.body;
      const updatedClass = {
        $set: {
          name: classData.name,
          price: classData.price,
          availableSeats: classData.availableSeats
        }
      }
      const result = await classCollection.updateOne(filter, updatedClass, option);
      res.send(result);
    })
    app.patch('/classes/approve/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateUser = {
        $set: {
          status: 'approve'
        }
      }
      const result = await classCollection.updateOne(filter, updateUser);
      res.send(result);
    })

    app.patch('/classes/deny/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateUser = {
        $set: {
          status: 'deny'
        }
      }
      const result = await classCollection.updateOne(filter, updateUser);
      res.send(result);
    })

    app.patch('/classes/feedback/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const { feedback } = req.body;
      const updatedClass = {
        $set: {
          feedback: feedback,
        },
      };
      const result = await classCollection.updateOne(filter, updatedClass, option);
      res.send(result);
    });


    app.get('/classes/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (!email) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'provided access' });
      }

      const query = { instructorEmail: email };
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/classes', async (req, res) => {
      const newClass = req.body;
      const result = await classCollection.insertOne(newClass)
      res.send(result)
    })




    // enrolls
    app.get('/enrolls/:id', async (req, res) => {
      const id = req.params.id;
      try {
        const query = { _id: new ObjectId(id) };
        const options = {
          projection: {
            _id: 1,
            name: 1,
            instructorName: 1,
            instructorEmail: 1,
            email: 1,
            price: 1
          }
        };
        const result = await enrollCollection.findOne(query, options);
    
        if (result) {
          res.send(result);
        } else {
          res.status(404).send({ error: true, message: 'Class not found' });
        }
      } catch (error) {
        res.status(500).send({ error: true, message: 'Internal server error' });
      }
    });
    

    app.get('/enrolls', verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([])
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'porviden access' })
      }
      const query = { email: email };
      const result = await enrollCollection.find(query).toArray();
      res.send(result);
    })


    app.post('/enrolls', async (req, res) => {
      const item = req.body;
      console.log(item);
      const result = await enrollCollection.insertOne(item);
      res.send(result);
    })

    app.delete('/enrolls/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await enrollCollection.deleteOne(query)
      res.send(result)
    })

    // payment
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntent.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
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



app.get('/', (req, res) => {
  res.send('mindscape')
})

app.listen(port, () => {
  console.log(`Mind ${port}`)
})