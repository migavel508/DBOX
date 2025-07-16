class Files {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const uploadForm = document.getElementById('upload-form');
        const uploadSubmit = document.getElementById('upload-submit');

        if (uploadSubmit) {
            uploadSubmit.addEventListener('click', () => {
                this.uploadFile(new FormData(uploadForm));
            });
        }

        const dropzone = document.querySelector('.dropzone');
        if (dropzone) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropzone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                dropzone.classList.add('dragover');
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropzone.classList.remove('dragover');
            });

            dropzone.addEventListener('drop', (e) => {
                const formData = new FormData();
                formData.append('file', e.dataTransfer.files[0]);
                this.uploadFile(formData);
            });
        }
    }

    async uploadFile(formData) {
        try {
            const file = formData.get('file');
            if (!file) throw new Error('No file selected');

            Swal.fire({
                title: 'Uploading to IPFS...',
                html: `<div class="progress upload-progress"><div class="progress-bar" role="progressbar" style="width: 0%"></div></div>`,
                allowOutsideClick: false,
                showConfirmButton: false,
                didOpen: () => Swal.showLoading()
            });

            // Upload to IPFS
            const ipfsForm = new FormData();
            ipfsForm.append('file', file);

            const addRes = await fetch('http://127.0.0.1:5001/api/v0/add?pin=true', {
                method: 'POST',
                body: ipfsForm
            });

            const addText = await addRes.text();
            const addLines = addText.trim().split('\n');
            const lastLine = addLines[addLines.length - 1];
            const { Hash: cid, Name: filename } = JSON.parse(lastLine);

            // Create /myuploads dir if needed
            await fetch('http://127.0.0.1:5001/api/v0/files/mkdir?arg=/myuploads&parents=true', {
                method: 'POST'
            });

            // Copy IPFS file to MFS
            await fetch(`http://127.0.0.1:5001/api/v0/files/cp?arg=/ipfs/${cid}&arg=/myuploads/${filename}`, {
                method: 'POST'
            });

            Swal.fire({
                icon: 'success',
                title: 'File Uploaded',
                html: `
                    <b>Filename:</b> ${filename}<br>
                    <b>CID:</b> ${cid}<br>
                    <a href="https://ipfs.io/ipfs/${cid}" target="_blank">View on IPFS Gateway</a><br>
                    <i>Also visible at WebUI > Files > /myuploads</i>
                `,
                timer: 5000,
                showConfirmButton: false
            });

        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Upload Failed',
                text: err.message
            });
        }
    }

    async loadFiles() {
        try {
            const response = await fetch('/api/storage/', {
                headers: auth.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to load files');
            }

            const files = await response.json();
            this.displayFiles(files);
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message
            });
        }
    }

    displayFiles(files) {
        const tbody = document.getElementById('files-list');
        if (!tbody) return;

        tbody.innerHTML = '';

        files.forEach(file => {
            const row = document.createElement('tr');
            row.classList.add('file-row');

            const size = this.formatFileSize(file.size);
            const date = new Date(file.uploadedAt).toLocaleString();

            row.innerHTML = `
                <td>${file.name}</td>
                <td>${size}</td>
                <td>${date}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="files.downloadFile('${file.id}')">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="files.deleteFile('${file.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        });
    }

    async downloadFile(fileId) {
        try {
            const response = await fetch(`/api/storage/${fileId}`, {
                headers: auth.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Download failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileId;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Download Failed',
                text: error.message
            });
        }
    }

    async deleteFile(fileId) {
        try {
            const { isConfirmed } = await Swal.fire({
                icon: 'warning',
                title: 'Delete File',
                text: 'Are you sure you want to delete this file?',
                showCancelButton: true,
                confirmButtonText: 'Delete',
                confirmButtonColor: '#dc3545'
            });

            if (!isConfirmed) return;

            const response = await fetch(`/api/storage/${fileId}`, {
                method: 'DELETE',
                headers: auth.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Delete failed');
            }

            Swal.fire({
                icon: 'success',
                title: 'Deleted',
                text: 'File deleted successfully',
                timer: 2000,
                showConfirmButton: false
            });

            this.loadFiles();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Delete Failed',
                text: error.message
            });
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

const files = new Files();
