const { db, admin } = require('../config/firebase');

const collections = {
  users: 'users',
  kycDocuments: 'kycDocuments',
  applications: 'applications',
  universities: 'universities',
  documents: 'documents',
  scholarships: 'scholarships',
  visaChecklists: 'visaChecklists',
  consultantNotes: 'consultantNotes',
  auditLogs: 'auditLogs',
  activities: 'activities',
  conversations: 'conversations',
  messages: 'messages',
  notifications: 'notifications',
};

const getDoc = async (collection, id) => {
  const snap = await db.collection(collection).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
};

const getDocs = async (collection, filters = [], orderBy = null, limit = null) => {
  let query = db.collection(collection);
  for (const f of filters) {
    query = query.where(f.field, f.op, f.value);
  }
  if (orderBy) query = query.orderBy(orderBy.field, orderBy.direction || 'asc');
  if (limit) query = query.limit(limit);
  const snap = await query.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

const addDoc = async (collection, data) => {
  const ref = await db.collection(collection).add(data);
  return { id: ref.id, ...data };
};

const setDoc = async (collection, id, data) => {
  await db.collection(collection).doc(id).set(data, { merge: true });
  return { id, ...data };
};

const updateDoc = async (collection, id, data) => {
  await db.collection(collection).doc(id).update(data);
  return { id, ...data };
};

const deleteDoc = async (collection, id) => {
  await db.collection(collection).doc(id).delete();
};

const queryOne = async (collection, field, op, value) => {
  const snap = await db.collection(collection).where(field, op, value).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
};

const increment = (amount = 1) => admin.firestore.FieldValue.increment(amount);
const serverTimestamp = () => admin.firestore.FieldValue.serverTimestamp();
const arrayUnion = (...elements) => admin.firestore.FieldValue.arrayUnion(...elements);
const arrayRemove = (...elements) => admin.firestore.FieldValue.arrayRemove(...elements);

module.exports = {
  collections, db,
  getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, queryOne,
  increment, serverTimestamp, arrayUnion, arrayRemove,
};
