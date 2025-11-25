import { Injectable } from '@angular/core';
import { openDB, type IDBPDatabase } from 'idb';

export interface MyFile {
  id?: number;
  name: string;
  encryptedData: string;
  iv: string;
  type: string;
  size: number;
  date: Date;
  folderId?: string;
}

export interface Folder {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  private db!: IDBPDatabase;
  private cryptoKey!: CryptoKey; // Clé AES dérivée du mot de passe

  //Initialisation la base  le mot de passe
   
  async init(password: string) {
    //  Derivation de clé (PBKDF2)
    this.cryptoKey = await this.deriveKey(password);

    //  Création ou ouverture d'IndexedDB
    this.db = await openDB('UltimateStorage', 3, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('folders')) {
          db.createObjectStore('folders', { keyPath: 'id' });
        }
      }
    });
  }

 

 
  private async deriveKey(password: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();


    const salt = encoder.encode('my_static_salt_v2');

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 250000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  //Chiffre les données brutes d'un fichier 
  private async encrypt(data: ArrayBuffer) {
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.cryptoKey,
      data
    );

    return {
      data: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv))
    };
  }

  //Déchiffre un fichier 
  private async decrypt(encrypted: string, iv: string): Promise<ArrayBuffer> {
    const encryptedBytes = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));

    return crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      this.cryptoKey,
      encryptedBytes
    );
  }

 

  async addFile(file: File, folderId?: string) {
    const buffer = await file.arrayBuffer();
    const { data, iv } = await this.encrypt(buffer);

    await this.db.add('files', {
      name: file.name,
      encryptedData: data,
      iv,
      type: file.type,
      size: file.size,
      date: new Date(),
      folderId
    });
  }

  async getAllFiles(): Promise<MyFile[]> {
    return await this.db.getAll('files');
  }

  async getFileBlob(file: MyFile): Promise<Blob> {
    const decrypted = await this.decrypt(file.encryptedData, file.iv);
    return new Blob([decrypted], { type: file.type });
  }

  async deleteFile(id: number) {
    await this.db.delete('files', id);
  }



  async createFolder(name: string) {
    await this.db.put('folders', { id: Date.now().toString(), name });
  }

  async getFolders(): Promise<Folder[]> {
    return (await this.db.getAll('folders')) || [];
  }

  async deleteFolder(id: string) {
    await this.db.delete('folders', id);
  }
}
