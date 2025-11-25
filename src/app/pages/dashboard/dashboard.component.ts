import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StorageService, MyFile, Folder } from '../../services/storage.service';
import { SyncService } from '../../services/sync.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  files: MyFile[] = [];
  folders: Folder[] = [];
  currentFolder: string | null = null;
  searchTerm = '';
  qrCodeUrl = '';
  shareLink = '';
  previewFile: MyFile | null = null;
  previewUrl: string | null = null;

  constructor(
    private storage: StorageService,
    private sync: SyncService,
    private auth: AuthService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    const pwd = prompt('Re-confirme ton mot de passe maître pour déchiffrer tes fichiers :');
    if (!pwd || pwd.trim() === '') {
      alert('Mot de passe requis !');
      this.router.navigate(['/login']);
      return;
    }

    try {
      await this.storage.init(pwd);
      await this.loadData();
    } catch {
      alert('Mot de passe incorrect ou données corrompues');
      this.router.navigate(['/login']);
    }
  }

  async loadData(): Promise<void> {
    this.files = await this.storage.getAllFiles();
    this.folders = await this.storage.getFolders();
  }

  async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    for (const file of Array.from(input.files)) {
      await this.storage.addFile(file, this.currentFolder || undefined);
    }
    await this.loadData();
  }

  async createFolder(): Promise<void> {
    const name = prompt('Nom du dossier ?');
    if (name?.trim()) {
      await this.storage.createFolder(name.trim());
      await this.loadData();
    }
  }

  openFolder(id: string): void {
    this.currentFolder = id;
  }

  back(): void {
    this.currentFolder = null;
  }

  async preview(file: MyFile): Promise<void> {
    this.previewFile = file;
    try {
      const blob = await this.storage.getFileBlob(file);
      this.previewUrl = URL.createObjectURL(blob);
    } catch {
      alert('Impossible de déchiffrer ce fichier');
      this.previewFile = null;
    }
  }

  closePreview(): void {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = null;
    this.previewFile = null;
  }

  async deleteFile(id?: number): Promise<void> {
    if (id && confirm('Supprimer définitivement ce fichier ?')) {
      await this.storage.deleteFile(id);
      await this.loadData();
    }
  }

  // NOUVELLE MÉTHODE POUR SUPPRIMER UN DOSSIER
  async deleteFolder(id: string): Promise<void> {
    if (confirm('Supprimer ce dossier et tout son contenu ?')) {
      const filesInFolder = this.files.filter(f => f.folderId === id);
      for (const file of filesInFolder) {
        if (file.id) await this.storage.deleteFile(file.id);
      }
      await this.storage.deleteFolder(id);
      await this.loadData();
    }
  }

  async generateQR(): Promise<void> {
    const pwd = prompt('Mot de passe pour synchroniser tous tes fichiers ?');
    if (pwd) this.qrCodeUrl = await this.sync.generateQR(pwd);
  }

  async shareFile(file: MyFile): Promise<void> {
    const pwd = prompt('Mot de passe pour partager ce fichier ?');
    if (!pwd) return;

    try {
      const blob = await this.storage.getFileBlob(file);
      const url = URL.createObjectURL(blob);
      this.shareLink = `Fichier : ${file.name}\nLien (5 min) → ${url}\nMot de passe : ${pwd}`;

      setTimeout(() => {
        URL.revokeObjectURL(url);
        if (this.shareLink.includes(url)) this.shareLink = '';
      }, 5 * 60 * 1000);
    } catch {
      alert('Erreur de déchiffrement');
    }
  }

  getCurrentFiles(): MyFile[] {
    return this.currentFolder
      ? this.files.filter(f => f.folderId === this.currentFolder)
      : this.files.filter(f => !f.folderId);
  }

  getFilteredFiles(): MyFile[] {
    return this.getCurrentFiles().filter(f =>
      f.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}