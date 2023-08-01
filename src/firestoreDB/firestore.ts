var admin = require('firebase-admin');

export class FirestoreDB {

  private db: any;

  constructor() {
    console.log('firestore constructor');

    var serviceAccount;
    try {
      if (!process.env.firebaseKey) throw ("");
      serviceAccount = JSON.parse(process.env.firebaseKey);
    } catch {
      console.log('failed to get env.port.firebaseKey. Looking for file in firebase.json');
      serviceAccount = require('../../firebaseKey.json')
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
    this.db = admin.firestore();
    this.db.settings({ ignoreUndefinedProperties: true })
  }

  async setDocumentValue(collectionPath: string, documentName: string, value: any) {
    return await this.db.collection(collectionPath).doc(documentName).set(value);
  }

  async updateDocumentValue(collectionPath: string, documentName: string, value: any) {
    return await this.db.collection(collectionPath).doc(documentName).update(value);
  }

  async updateDocumentValueAtPath(collectionPath: string, documentName: string, path: string, value: any){
    return await this.db.collection(collectionPath).doc(documentName).update(path,value);
  }

  async deleteDocument(collectionPath: string, documentName: string) {
    return await this.db.collection(collectionPath).doc(documentName).delete();
  }

  async getDocumentData(collectionPath: string, documentName: string): Promise<any> {
    let doc = this.db.collection(collectionPath).doc(documentName);
    let data = (await doc.get()).data();
    return data;
  }

  async getCollectionData(collectionPath: string): Promise<any[]> {
    let collection = await this.db.collection(collectionPath).get();
    let data: any[] = [];
    collection.forEach((doc: { data: () => any; }) => {
      data.push(doc.data());
    });
    return data;
  }

  getColletionRef(collectionPath: string) {
    return this.db.collection(collectionPath);
  }

  getDocumentRef(collectionPath: string, documentName: string) {
    return this.db.collection(collectionPath).doc(documentName);
  }

  async test() {
    await this.db.collection('devices').doc('1').update({ [`deviceFieldGroups.${"hello"}.xx`]: true })
  }

}