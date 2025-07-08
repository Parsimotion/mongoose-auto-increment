const { expect } = require('chai');
const mongoose = require('mongoose');
const autoIncrement = require('..');

let connection;

before(async () => {
  connection = mongoose.createConnection('mongodb://127.0.0.1/mongoose-auto-increment-test');
  await new Promise((resolve, reject) => {
    connection.once('open', resolve);
    connection.on('error', reject);
  });
  autoIncrement.initialize(connection);
});

after(async () => {
  await connection.db.dropDatabase();
  await connection.close();
});

afterEach(async () => {
  try {
    await connection.model('User').collection.drop();
  } catch (e) { } // Ignore if already dropped
  delete connection.models.User;

  try {
    await connection.model('IdentityCounter').collection.drop();
  } catch (e) { } // Ignore if already dropped
});

describe('mongoose-auto-increment', () => {
  it('should increment the _id field on save', async () => {
    const userSchema = new mongoose.Schema({ name: String, dept: String });
    userSchema.plugin(autoIncrement.plugin, 'User');
    const User = connection.model('User', userSchema);

    const user1 = new User({ name: 'Charlie', dept: 'Support' });
    const user2 = new User({ name: 'Charlene', dept: 'Marketing' });

    const saved1 = await user1.save();
    const saved2 = await user2.save();

    expect(saved1).to.have.property('_id', 0);
    expect(saved2).to.have.property('_id', 1);
  });

  it('should increment the specified field instead', async () => {
    const userSchema = new mongoose.Schema({ name: String, dept: String });
    userSchema.plugin(autoIncrement.plugin, { model: 'User', field: 'userId' });
    const User = connection.model('User', userSchema);

    const user1 = new User({ name: 'Charlie', dept: 'Support' });
    const user2 = new User({ name: 'Charlene', dept: 'Marketing' });

    const saved1 = await user1.save();
    const saved2 = await user2.save();

    expect(saved1).to.have.property('userId', 0);
    expect(saved2).to.have.property('userId', 1);
  });

  it('should start counting at specified number', async () => {
    const userSchema = new mongoose.Schema({ name: String, dept: String });
    userSchema.plugin(autoIncrement.plugin, { model: 'User', startAt: 3 });
    const User = connection.model('User', userSchema);

    const user1 = new User({ name: 'Charlie', dept: 'Support' });
    const user2 = new User({ name: 'Charlene', dept: 'Marketing' });

    const saved1 = await user1.save();
    const saved2 = await user2.save();

    expect(saved1).to.have.property('_id', 3);
    expect(saved2).to.have.property('_id', 4);
  });

  it('should increment by the specified amount', async () => {
    const userSchema = new mongoose.Schema({ name: String, dept: String });

    expect(() => {
      userSchema.plugin(autoIncrement.plugin);
    }).throw(Error);


    userSchema.plugin(autoIncrement.plugin, { model: 'User', incrementBy: 5 });
    const User = connection.model('User', userSchema);

    const user1 = new User({ name: 'Charlie', dept: 'Support' });
    const user2 = new User({ name: 'Charlene', dept: 'Marketing' });

    const saved1 = await user1.save();
    const saved2 = await user2.save();

    expect(saved1).to.have.property('_id', 0);
    expect(saved2).to.have.property('_id', 5);
  });

  describe('helper functions', () => {
    it('nextCount should return the next count for the model and field', async () => {
      const userSchema = new mongoose.Schema({ name: String, dept: String });
      userSchema.plugin(autoIncrement.plugin, 'User');
      const User = connection.model('User', userSchema);

      const user1 = new User({ name: 'Charlie', dept: 'Support' });
      const user2 = new User({ name: 'Charlene', dept: 'Marketing' });

      const count1 = await user1.nextCount();
      const saved1 = await user1.save();
      const count2 = await user1.nextCount();
      const saved2 = await user2.save();
      const count3 = await user2.nextCount();

      expect(count1).to.equal(0);
      expect(saved1).to.have.property('_id', 0);
      expect(count2).to.equal(1);
      expect(saved2).to.have.property('_id', 1);
      expect(count3).to.equal(2);
    });

    it('resetCount should reset the counter', async () => {
      const userSchema = new mongoose.Schema({ name: String, dept: String });
      userSchema.plugin(autoIncrement.plugin, 'User');
      const User = connection.model('User', userSchema);

      const user = new User({ name: 'Charlie', dept: 'Support' });

      const saved = await user.save();
      const count1 = await user.nextCount();
      const reset = await user.resetCount();
      const count2 = await user.nextCount();

      expect(saved).to.have.property('_id', 0);
      expect(count1).to.equal(1);
      expect(reset).to.equal(0);
      expect(count2).to.equal(0);
    });
  });
});
