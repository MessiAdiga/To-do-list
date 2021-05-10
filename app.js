//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');
mongoose.set('useFindAndModify', false);

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

//Create Item schema and add items

mongoose.connect("mongodb+srv://<user-name>:<Password>@cluster0.arsfj.mongodb.net/todolistDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
});
const itemsSchema = {
  name: String
};

//create Model
const Item = mongoose.model("Item", itemsSchema);

//create Items
const item1 = new Item({
  name: "Welcome to your todolist!"
});

const item2 = new Item({
  name: "Hit + to add new items"
});

const item3 = new Item({
  name: "Hit the checkbox to delete completed task"
});

const defaultItems = [item1, item2, item3];

const listSchema = {
  name: String,
  items: [itemsSchema]
};

//schema for custom todolist
const List = mongoose.model("List", listSchema);

//Render the items each time we trigger the root route
app.get("/", function(req, res) {

  Item.find({}, function(err, foundItems) {
    //insert array of items into DB if array is empty

    if (foundItems.length === 0) {
      Item.insertMany(defaultItems, function(err) {
        if (err) {
          console.log(err);
        } else {
          console.log("Successfully added items to database!");
        }
      });
      res.redirect("/");
    } else {
      res.render("list", {
        listTitle: "Today",
        newListItems: foundItems
      });
    }
  });
});

//custom list that reuses defaultItems.
app.get("/:customListName", function(req, res) {
  const customListName = _.capitalize(req.params.customListName);

  List.findOne({
    name: customListName
  }, function(err, foundList) {
    if (!err) {
      if (!foundList) {
        //Create a new list

        const list = new List({
          name: customListName,
          items: defaultItems
        });

        list.save();
        res.redirect("/" + customListName);
      } else {
        //Show an existing list
        res.render("list", {
          listTitle: foundList.name,
          newListItems: foundList.items
        })
      }
    }
  });


});

//add new items from screen
app.post("/", function(req, res) {

  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({
    name: itemName
  });

//check to see whether the list you want to add items to is the default listt list or custom list
  if (listName === "Today") {
    item.save();
    res.redirect("/");
  } else {
    List.findOne({name: listName}, function(err,foundList) {
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }
});

app.post("/delete", function(req, res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  //delete from the default list "Today"
  if(listName === "Today"){
    Item.findByIdAndRemove(checkedItemId, function(err) {
      if (!err) {
        console.log("Successfully removed checked item!");
        res.redirect("/");
      }
    });
  } else {   //delete from the custom list
    List.findOneAndUpdate({name: listName}, {$pull : {items: {_id: checkedItemId}}}, {useFindAndModify: false}, function(err, foundList){
      if(!err){
        res.redirect("/" + listName);
      }
    });
  }

});

//run app on heroku or locally
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server started successfully!");
});
