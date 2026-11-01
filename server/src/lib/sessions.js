import mongoose from 'mongoose';

// Signs a person out everywhere by deleting their stored sessions. Used when an administrator
// issues a new password, so an old sign-in (for example on a lost phone) stops working at once.
export async function endSessionsFor(userId) {
  const id = String(userId);
  if (!/^[a-f0-9]{24}$/.test(id)) return;
  try {
    await mongoose.connection.collection('sessions').deleteMany({ session: { $regex: `"userId":"${id}"` } });
  } catch (error) {
    console.error('Could not end sessions:', error.message);
  }
}
