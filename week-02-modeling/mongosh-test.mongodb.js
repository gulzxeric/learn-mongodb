// show('dbs')
use('aa')
db.bb.insertOne({
  bb: 1
})
db.bb.insertOne({
  cc: 123
})
db.cc.insertOne({
  bb: 1
})
db.cc.insertOne({
  cc: 123
})
show("collections")
let a = db.bb.find()
let b = db.cc.find()
print('a previos',a)
db.bb.drop()
a = db.bb.find()
print('a after',a, 'b after',b)
// show("dbs")
// db.dropDatabase()
// show("dbs")

// db.dropDatabase()
// show dbs