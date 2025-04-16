require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(express.json());
app.use(cors());

const uri = process.env.DB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection

    // DB Collection
    const userCollection = client.db("KashemDB").collection("users");
    const categoryCollection = client.db("KashemDB").collection("categories");
    const productCollection = client.db("KashemDB").collection("products");
    const bannerCollection = client.db("KashemDB").collection("banners");
    const cartCollection = client.db("KashemDB").collection("carts");
    const orderCollection = client.db("KashemDB").collection("orders");
    const patientCollection = client.db("KashemDB").collection("patients");

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    //jwt middleware
    const verifyToken = (req, res, next) => {
      // console.log('inside Verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "access-unauthorized" });
      }
      const token = req.headers.authorization.split(" ")[1];
      // verify a token symmetric
      jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
          return res.status(401).send({ message: "access-unauthorized" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // user collection
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const isExist = await userCollection.findOne(query);
      if (isExist) {
        return res.send({ message: "User already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    app.get("/users", async (req, res) => {
      const search = req.query.search;
      const query = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });
    app.patch("/users/:id/:role", async (req, res) => {
      const id = req.params.id;
      const role = req.params.role;
      // console.log(role, id);
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: role,
        },
      };
      const result = await userCollection.updateOne(query, updatedDoc);
      res.send(result);
    });
    app.put("/users/profile/:id", async (req, res) => {
      const id = req.params.id;
      const userInfo = req.body;
      if (!id || !ObjectId.isValid(id)) {
        const result = await userCollection.insertOne(userInfo);
        return res.send(result);
      }
      // console.log(id, userInfo);
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          name: userInfo.name,
          mobile: userInfo.mobile,
          image: userInfo.image,
        },
      };
      const options = { upsert: true };
      const result = await userCollection.updateOne(query, updatedDoc, options);
      res.send(result);
    });
    app.get("/user", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      // console.log(result);
      res.send(result);
    });
    // get role
    app.get("/user/role/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const user = await userCollection.findOne(filter);

      if (!user) {
        return res.status(404).send({ role: null, message: "User not found" });
      }

      res.send({ role: user.role });
    });

    // category

    // post category
    app.post("/categories", async (req, res) => {
      const category = req.body;
      const result = await categoryCollection.insertOne(category);
      res.send(result);
    });

    // get category
    app.get("/categories", async (req, res) => {
      const result = await categoryCollection.find().toArray();
      res.send(result);
    });
    // get single category
    app.get("/category/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await categoryCollection.findOne(filter);
      res.send(result);
    });
    // update category
    app.patch("/category/update/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          name: data.name,
          image: data.image,
          description: data.description,
        },
      };
      const result = await categoryCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // delete category
    app.delete("/category/delete/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await categoryCollection.deleteOne(filter);
      res.send(result);
    });

    //  'name', 'category', 'gender', 'origin', 'caseMetal', 'caseSize', 'braceletMaterial', 'glassType', 'color', 'wr', 'price', 'status', 'description', 'image'

    // product
    app.post("/products", async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    });

    // app.get('/products', async (req, res) => {
    //     const search = req.query.search
    //     const category = req.query.category
    //     const query = {}
    //     if (search) {
    //         query.name = { $regex: search, $options: "i" };
    //     }
    //     if (category) {
    //         query.category = category

    //     }
    //     // console.log(query);
    //     const result = await productCollection.find(query).sort({ _id: -1 }).toArray()
    //     res.send(result);
    // })
    app.get("/products", async (req, res) => {
      const {
        search,
        category,
        gender,
        brand,
        material,
        minPrice,
        maxPrice,
        sort,
        size,
        type,
      } = req.query;
      const query = {};

      // Build the query based on filters
      if (search) {
        query.$or = [
          { productName: { $regex: search, $options: "i" } },
          { brandName: { $regex: search, $options: "i" } },
        ];
      }
      if (category) {
        query.category = category;
      }
      if (gender) {
        query.gender = gender;
      }
      if (brand) {
        query.brandName = brand; // Assuming "brand" in query refers to origin
      }
      if (material) {
        query.frameMaterial = material;
      }
      if (size) {
        query.frameSize = size;
      }
      if (type) {
        query.frameType = type;
      }

      const pipeline = [
        { $match: query },
        {
          $project: {
            priceNum: { $toDouble: "$price.amount" }, // Convert price.amount to number
            productName: 1, // Updated to use brandName
            brandName: 1, // Updated to use brandName
            category: 1,
            gender: 1,
            origin: 1,
            frameMaterial: 1,
            image: 1,
            status: 1,
            price: 1, // Include the full price object for display
            frameSize: 1, // Include the full price object for display
            // Include other fields as needed
          },
        },
      ];

      // Apply price range filter
      if (minPrice || maxPrice) {
        const priceFilter = {};
        if (minPrice) priceFilter.$gte = parseFloat(minPrice);
        if (maxPrice) priceFilter.$lte = parseFloat(maxPrice);
        pipeline.push({ $match: { priceNum: priceFilter } });
      }

      // Apply sorting
      if (sort) {
        pipeline.push({ $sort: { priceNum: sort === "asc" ? 1 : -1 } });
      } else {
        pipeline.push({ $sort: { _id: -1 } });
      }

      try {
        const result = await productCollection.aggregate(pipeline).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error in /products endpoint:", error);
        res.status(500).send({ error: "Failed to fetch products" });
      }
    });

    app.get("/filter-options", async (req, res) => {
      try {
        // Fetch distinct genders
        const genders = await productCollection
          .aggregate([
            { $group: { _id: "$gender" } },
            { $match: { _id: { $ne: null } } }, // Exclude null values
            { $project: { _id: 0, value: "$_id" } },
          ])
          .toArray()
          .then((results) => results.map((r) => r.value));

        // Fetch distinct brands
        const brands = await productCollection
          .aggregate([
            { $group: { _id: "$brandName" } },
            { $match: { _id: { $ne: null } } },
            { $project: { _id: 0, value: "$_id" } },
          ])
          .toArray()
          .then((results) => results.map((r) => r.value));

        // Fetch distinct materials
        const materials = await productCollection
          .aggregate([
            { $group: { _id: "$frameMaterial" } },
            { $match: { _id: { $ne: null } } },
            { $project: { _id: 0, value: "$_id" } },
          ])
          .toArray()
          .then((results) => results.map((r) => r.value));

        // frame size
        const sizes = await productCollection
          .aggregate([
            { $group: { _id: "$frameSize" } },
            { $match: { _id: { $ne: null } } },
            { $project: { _id: 0, value: "$_id" } },
          ])
          .toArray()
          .then((results) => results.map((r) => r.value));
        // color
        const colors = await productCollection
          .aggregate([
            { $group: { _id: "$color" } },
            { $match: { _id: { $ne: null } } },
            { $project: { _id: 0, value: "$_id" } },
          ])
          .toArray()
          .then((results) => results.map((r) => r.value));

        // frame type
        const types = await productCollection
          .aggregate([
            { $group: { _id: "$frameType" } },
            { $match: { _id: { $ne: null } } },
            { $project: { _id: 0, value: "$_id" } },
          ])
          .toArray()
          .then((results) => results.map((r) => r.value));

        // Fetch price range
        const priceDocs = await productCollection
          .aggregate([
            {
              $match: { "price.amount": { $exists: true, $ne: null } }, // Ensure price.amount exists and isn't null
            },
            {
              $project: {
                priceNum: { $toDouble: "$price.amount" }, // Convert price.amount to number
              },
            },
            {
              $sort: { priceNum: 1 }, // Sort numerically
            },
          ])
          .toArray();

        const minPrice = priceDocs.length > 0 ? priceDocs[0].priceNum : 0;
        const maxPrice =
          priceDocs.length > 0 ? priceDocs[priceDocs.length - 1].priceNum : 0;

        res.send({
          genders,
          brands,
          materials,
          sizes,
          types,
          colors,
          priceRange: {
            min: isNaN(minPrice) ? 0 : minPrice,
            max: isNaN(maxPrice) ? 0 : maxPrice,
          },
        });
      } catch (error) {
        console.error("Error in /filter-options:", error);
        res.status(500).send({ error: "Failed to fetch filter options" });
      }
    });
    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(filter);
      res.send(result);
    });

    app.delete("/product/delete/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(filter);
      res.send(result);
    });

    // update product
    app.patch("/product/update/:id", async (req, res) => {
      const id = req.params.id;
      const product = req.body;

      // Validate ObjectId
      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: "Invalid product ID" });
      }

      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          productName: product.productName,
          brandName: product.brandName,
          productType: product.productType,
          modelNo: product.modelNo,
          category: product.category,
          gender: product.gender,
          origin: product.origin,
          manufacturer: product.manufacturer,
          warranty: product.warranty,
          color: product.color,
          price: {
            amount: product.price.amount,
            currency: product.price.currency,
            discount: {
              percentage: product.price.discount.percentage,
              discountedAmount: product.price.discount.discountedAmount,
            },
          },
          description: product.description,
          collection: product.collection,
          image: product.image, // Array of image URLs
          status: product.status,
          frameType: product.frameType,
          frameShape: product.frameShape,
          frameMaterial: product.frameMaterial,
          templeMaterial: product.templeMaterial,
          frameSize: product.frameSize,
          frameWidth: product.frameWidth,
          dimensions: product.dimensions,
          weight: product.weight,
          weightGroup: product.weightGroup,
          frameStyle: product.frameStyle,
          frameStyleSecondary: product.frameStyleSecondary,
          prescription: product.prescription,
          lensMaterial: product.lensMaterial,
          caseMetal: product.caseMetal,
          caseSize: product.caseSize,
          braceletMaterial: product.braceletMaterial,
          glassType: product.glassType,
          wr: product.wr,
        },
      };

      try {
        const result = await productCollection.updateOne(filter, updatedDoc);
        if (result.matchedCount === 0) {
          return res.status(404).send({ error: "Product not found" });
        }
        res.send(result);
      } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).send({ error: "Failed to update product" });
      }
    });

    // Banner Management
    app.post("/banners", async (req, res) => {
      const banner = req.body;
      const result = await bannerCollection.insertOne(banner);
      res.send(result);
    });
    app.get("/banners", async (req, res) => {
      // const result = await bannerCollection.aggregate([{ $sample: { size: await bannerCollection.countDocuments() } }]).toArray();
      const result = await bannerCollection.find().toArray();
      res.send(result);
    });
    app.patch("/banner/status/:id", async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: status,
        },
      };
      // console.log(status);
      const result = await bannerCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    app.delete("/banner/delete/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await bannerCollection.deleteOne(filter);
      res.send(result);
    });

    // ---------------------------- cart section------------------------------
    // add to cart
    app.post("/carts", async (req, res) => {
      const cart = req.body;
      // console.log(cart);

      const existingItem = await cartCollection.findOne({
        productId: cart.productId, // Changed from medicineId to productId
        "customer.customerEmail": cart.customer.customerEmail,
      });

      if (existingItem) {
        return res.status(400).json({
          error: "Item already exists in cart",
          existingItem: {
            _id: existingItem._id,
            productName: existingItem.productName,
            quantity: existingItem.quantity,
          },
        });
      }

      const result = await cartCollection.insertOne(cart);
      res.send(result);
    });

    // get cart
    app.get("/carts", async (req, res) => {
      // console.log(req.query);
      const result = await cartCollection
        .find({ "customer.customerEmail": req.query.email })
        .toArray();
      res.send(result);
    });

    // update quantity
    app.patch("/carts/quantity/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { quantity } = req.body;

        // Validate quantity
        if (!quantity || typeof quantity !== "number" || quantity < 1) {
          return res.status(400).json({ error: "Invalid quantity provided" });
        }

        const result = await cartCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { quantity } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: "Cart item not found" });
        }

        res.status(200).json({
          message: "Quantity updated successfully",
          modifiedCount: result.modifiedCount,
        });
      } catch (error) {
        console.error("Error updating quantity:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // Delete single cart item
    app.delete("/carts/delete/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const result = await cartCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: "Cart item not found" });
        }

        res.status(200).json({
          message: "Cart item deleted successfully",
          deletedCount: result.deletedCount,
        });
      } catch (error) {
        console.error("Error deleting cart item:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // Clear cart by email
    app.delete("/carts/clear/:email", async (req, res) => {
      try {
        const email = req.params.email;

        const result = await cartCollection.deleteMany({
          "customer.customerEmail": email,
        });

        if (result.deletedCount === 0) {
          return res
            .status(404)
            .json({ error: "No cart items found for this user" });
        }

        res.status(200).json({
          message: "Cart cleared successfully",
          deletedCount: result.deletedCount,
        });
      } catch (error) {
        console.error("Error clearing cart:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // ---------------------------------------------Order Related Routes--------------------------------
    app.post("/orders", async (req, res) => {
      try {
        const order = req.body;
        const result = await orderCollection.insertOne(order);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    // GET all orders or orders by email, with optional search by customer name or phone
    app.get("/orders", async (req, res) => {
      try {
        const email = req.query.email;
        const search = req.query.search; // Add search query parameter
        const query = {};

        // If email is provided, filter orders by customer email
        if (email) {
          query["customerInfo.email"] = email;
        }

        // If search is provided, filter by customer name or phone
        if (search) {
          query.$or = [
            { "customerInfo.name": { $regex: search, $options: "i" } },
            { "customerInfo.phone": { $regex: search, $options: "i" } },
          ];
        }

        // Fetch orders, sorted by date in descending order (-1)
        const result = await orderCollection
          .find(query)
          .sort({ date: -1 })
          .toArray();

        // Send success response with orders
        res.send(result);
      } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({
          message: "Failed to retrieve orders",
          error: error.message || "Internal server error",
        });
      }
    });
    // change order status
    app.patch("/orders/change-status/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { orderStatus } = req.body;

        // Validate input
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: "Invalid order ID" });
        }
        if (!orderStatus) {
          return res.status(400).json({ message: "Order status is required" });
        }

        // Define filter and update operation
        const filter = { _id: new ObjectId(id) };
        const updatedOrderStatus = {
          $set: { orderStatus: orderStatus },
        };

        const result = await orderCollection.updateOne(
          filter,
          updatedOrderStatus
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "Order not found" });
        }
        res.send(result);
      } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({
          message: "Failed to update order status",
          error: error.message || "Internal server error",
        });
      }
    });

    // change payment status
    app.patch("/orders/payment/:id", async (req, res) => {
      const id = req.params.id;
      const { paymentStatus } = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          paymentStatus: paymentStatus,
        },
      };
      const result = await orderCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // generate invoice

    app.get("/invoice/:orderId", async (req, res) => {
      try {
        const orderId = req.params.orderId;

        // Validate the orderId as a valid ObjectId
        if (!ObjectId.isValid(orderId)) {
          return res.status(400).json({ message: "Invalid order ID" });
        }

        const result = await orderCollection
          .aggregate([
            {
              // Match the document by _id (orderId)
              $match: {
                _id: new ObjectId(orderId),
              },
            },
            {
              // Unwind the products array to process each item
              $unwind: "$products",
            },
            {
              // Group the data back together with formatted invoice details
              $group: {
                _id: "$_id",
                customerInfo: { $first: "$customerInfo" },
                totalPrice: { $first: "$totalPrice" },
                paymentStatus: { $first: "$paymentStatus" },
                orderStatus: { $first: "$orderStatus" },
                discountPercentage: { $first: "$discountPercentage" },
                discountAmount: { $first: "$discountAmount" },
                date: { $first: "$date" },
                products: {
                  $push: {
                    productId: "$products.productId",
                    productName: "$products.productName",
                    quantity: "$products.quantity",
                    price: "$products.price",
                    subtotal: "$products.subtotal",
                    brandName: "$products.brandName",
                  },
                },
              },
            },
            {
              // Project to shape the final output
              $project: {
                _id: 1,
                customerInfo: 1,
                totalPrice: 1,
                paymentStatus: 1,
                orderStatus: 1,
                discountPercentage: 1,
                discountAmount: 1,
                date: 1,
                products: 1,
              },
            },
          ])
          .toArray();

        // Return the first result or an empty object if no match found
        if (result.length === 0) {
          return res.status(404).json({ message: "Order not found" });
        }

        res.status(200).json(result[0]);
      } catch (error) {
        console.error("Error generating invoice:", error);
        res.status(500).json({
          message: "Failed to generate invoice",
          error: error.message || "Internal server error",
        });
      }
    });

    // ----------------------------------------Patient related APIS------------------------------
    app.post("/patients", async (req, res) => {
      const patient = req.body;

      const result = await patientCollection.insertOne(patient);
      res.send(result);
    });
    // update patient
    app.patch("/patients/:id", async (req, res) => {
      const id = req.params.id;
      const updatedPatient = req.body;

      try {
        // Validate ObjectId
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ error: "Invalid patient ID" });
        }

        // Remove _id from updatedPatient to prevent modifying it
        delete updatedPatient._id;

        const result = await patientCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedPatient }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ error: "Patient not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating patient:", error);
        res.status(500).send({ error: "Internal server error" });
      }
    });

    app.get("/patients", async (req, res) => {
      const search = req.query.search;
      const query = {};
      // If search is provided, filter by customer name or phone
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ];
      }

      const result = await patientCollection
        .find(query)
        .sort({ date: -1 })
        .toArray();
      res.send(result);
    });

    // delete patient
    app.delete("/patient/delete/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const result = await patientCollection.deleteOne(filter);
      res.send(result);
    });

    // ----------------------------------------Stats related APIS------------------------------
    app.get("/admin-stats", async (req, res) => {
      const totalBanners = await bannerCollection.estimatedDocumentCount();
      const activeBanners = await bannerCollection.countDocuments({
        status: "added",
      });
      const inactiveBanners = await bannerCollection.countDocuments({
        status: "removed",
      });

      // product stats
      const totalProduct = await productCollection.estimatedDocumentCount();
      const totalInStockProduct = await productCollection.countDocuments({
        status: "In Stock",
      });
      const totalOutOfStockProduct = await productCollection.countDocuments({
        status: "Out of Stock",
      });
      const totalUsers = await userCollection.estimatedDocumentCount();
      const totalAdmin = await userCollection.countDocuments({
        role: "Admin",
      });
      const totalPatient = await patientCollection.estimatedDocumentCount();

      // Category Breakdown
      const productsPerCategory = await productCollection
        .aggregate([
          { $group: { _id: "$category", count: { $sum: 1 } } },
          { $project: { _id: 0, category: "$_id", count: 1 } },
          { $sort: { count: -1 } },
        ])
        .toArray();
      res.send({
        totalAdmin,
        activeBanners,
        inactiveBanners,
        totalProduct,
        totalInStockProduct,
        totalOutOfStockProduct,
        totalUsers,
        totalPatient,
        productsPerCategory,
      });
    });

    // ----------------------------------------sales-repot APIS------------------------------

    app.get("/sales-report", async (req, res) => {
      try {
        // Total orders
        const totalOrders = await orderCollection.estimatedDocumentCount();

        // Delivered orders
        const deliveredOrders = await orderCollection.countDocuments({
          orderStatus: "Delivered",
        });

        // Pending orders
        const pendingOrders = await orderCollection.countDocuments({
          orderStatus: "Pending",
        });

        // Total revenue
        const totalRevenueResult = await orderCollection
          .aggregate([
            {
              $match: {
                paymentStatus: "Paid",
              },
            },
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: { $toDouble: "$totalPrice" } },
              },
            },
          ])
          .toArray();

        const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0;

        // Revenue per day with totalQty
        const revenuePerDay = await orderCollection
          .aggregate([
            {
              $match: {
                paymentStatus: "Paid",
              },
            },
            {
              $unwind: "$products", // Flatten products array
            },
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: { $toDate: "$date" }, // Convert string to Date
                  },
                },
                totalRevenue: { $sum: { $toDouble: "$totalPrice" } },
                totalQty: { $sum: "$products.quantity" }, // Sum product quantities
              },
            },
            {
              $sort: {
                _id: 1,
              },
            },
          ])
          .toArray();

        // Top selling products
        const topSellingProducts = await orderCollection
          .aggregate([
            {
              $match: {
                paymentStatus: "Paid", // Only include paid orders
              },
            },
            {
              $unwind: "$products",
            },
            {
              $group: {
                _id: "$products.productName",
                totalQty: { $sum: "$products.quantity" },
              },
            },
            {
              $project: {
                product: "$_id",
                totalQty: 1,
                _id: 0,
              },
            },
            {
              $sort: {
                totalQty: -1,
              },
            },
            {
              $limit: 5, // Top 5 products
            },
          ])
          .toArray();

        // Top customers
        const topCustomers = await orderCollection
          .aggregate([
            {
              $match: {
                paymentStatus: "Paid", // Only include paid orders
              },
            },
            {
              $group: {
                _id: "$customerInfo.email",
                name: { $first: "$customerInfo.name" },
                phone: { $first: "$customerInfo.phone" },
                totalOrders: { $sum: 1 },
                totalSpent: { $sum: { $toDouble: "$totalPrice" } },
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "email",
                as: "userInfo",
              },
            },
            {
              $unwind: {
                path: "$userInfo",
                preserveNullAndEmptyArrays: true, // Keep customers even if no match in users collection
              },
            },
            {
              $project: {
                _id: 0,
                name: 1,
                email: "$_id",
                phone: 1,
                userId: "$userInfo._id", // Use _id from users collection instead of uid
                photo: "$userInfo.image", // Map image to photo
                totalOrders: 1,
                totalSpent: 1,
              },
            },
            { $sort: { totalSpent: -1 } }, // Sort by totalSpent in descending order
          ])
          .toArray();

        // Revenue per division
        const revenuePerDivision = await orderCollection
          .aggregate([
            {
              $match: {
                paymentStatus: "Paid", // Only include paid orders
              },
            },
            {
              $group: {
                _id: "$customerInfo.division",
                totalRevenue: { $sum: { $toDouble: "$totalPrice" } },
                totalOrders: { $sum: 1 },
              },
            },
            { $sort: { totalRevenue: -1 } },
          ])
          .toArray();

        res.send({
          totalOrders,
          deliveredOrders,
          pendingOrders,
          totalRevenue,
          revenuePerDay,
          topSellingProducts,
          topCustomers,
          revenuePerDivision,
        });
      } catch (error) {
        console.error("Error in /sales-report:", error);
        res.status(500).send({ error: "Internal server error" });
      }
    });

    // discount voucher
    // update shopping discount
    app.patch("/user/update-discount/:email", async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      const { discount } = req.body;
      const filter = { email: email };
      // console.log(discount, email)

      const updatedDoc = {
        $set: {
          discountVoucher: parseInt(discount),
        },
      };
      try {
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to update discount" });
      }
    });

    app.get("/users/discount/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await userCollection.findOne(filter);
      res.send({ discountVoucher: result?.discountVoucher || null });
    });

    app.get("/top-selling-products", async (req, res) => {
      const topSellingProducts = await orderCollection
        .aggregate([
          {
            $match: {
              paymentStatus: "Paid", // Only include paid orders
            },
          },
          {
            $unwind: "$products", // Flatten the products array
          },
          {
            $group: {
              _id: {
                productId: "$products.productId",
                productName: "$products.productName",
                price: "$products.price",
                brandName: "$products.brandName",
                image: "$products.image",
              },
              totalQty: { $sum: "$products.quantity" },
            },
          },
          {
            $project: {
              _id: 0,
              productId: "$_id.productId",
              productName: "$_id.productName",
              price: "$_id.price",
              brandName: "$_id.brandName",
              image: "$_id.image",
              totalQty: 1,
            },
          },
          {
            $sort: {
              totalQty: -1, // Sort by total quantity in descending order
            },
          },
          {
            $limit: 10, // Top 10 products
          },
        ])
        .toArray();
      res.send(topSellingProducts);
    });

    // get latest 9 products
    // GET latest 9 products
    app.get("/latest-products", async (req, res) => {
      try {
        const latestProducts = await productCollection
          .find()
          .sort({ _id: -1 }) // Sort by creation date, newest first
          .limit(9)
          .project({
            productId: "$_id",
            productName: 1,
            price: 1,
            brandName: 1,
            image: 1,
            status: 1,
            _id: 0,
          })
          .toArray();

        res.send(latestProducts);
      } catch (error) {
        console.error("Error fetching latest products:", error);
        res.status(500).json({ error: "Failed to fetch latest products" });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("kashem optics server is running");
});
app.listen(port, () => {
  console.log("server running on: ", port);
});
