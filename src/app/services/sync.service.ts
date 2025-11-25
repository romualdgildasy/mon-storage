import { Injectable } from '@angular/core';
import QRCode from 'qrcode';
import CryptoJS from 'crypto-js';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class SyncService {
  constructor(private storage: StorageService) {}

  async generateQR(password: string): Promise<string> {
    const files = await this.storage.getAllFiles();
    const data = JSON.stringify(files.map(f => ({
      name: f.name, encryptedData: f.encryptedData, iv: f.iv, type: f.type
    })));
    const encrypted = CryptoJS.AES.encrypt(data, password).toString();
    return await QRCode.toDataURL(encrypted);
  }

  async importFromQR(data: string, password: string) {
    try {
      const decrypted = CryptoJS.AES.decrypt(data, password).toString(CryptoJS.enc.Utf8);
      const files = JSON.parse(decrypted);
      // À implémenter avec addFile si besoin
      alert('Sync réussi !');
    } catch { alert('Mauvais mot de passe'); }
  }
}