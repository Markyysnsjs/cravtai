class CravtAI {
    constructor() {
        // 🔥 НАСТОЯЩИЙ BACKEND URL (замени после деплоя)
        this.BACKEND_URL = 'http://localhost:5000/chat';
        this.chats = JSON.parse(localStorage.getItem('cravt-chats')) || [];
        this.currentChatId = null;
        this.init();
    }

    init() {
        this.ensureDefaultChat();
        this.bindEvents();
        this.loadInterface();
    }

    bindEvents() {
        document.addEventListener('DOMContentLoaded', () => {
            this.messageInput = document.getElementById('messageInput');
            this.messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            this.messageInput.focus();
        });
    }

    async sendMessage() {
        const text = this.messageInput.value.trim();
        if (!text) return;

        this.addMessage('user', text);
        this.messageInput.value = '';
        document.getElementById('sendBtn').disabled = true;

        const aiId = this.addMessage('ai', ' ', true);
        
        try {
            const reply = await this.callBackend(text);
            this.updateMessage(aiId, reply);
        } catch (e) {
            this.updateMessage(aiId, 'Backend недоступен');
        }
        
        document.getElementById('sendBtn').disabled = false;
        this.messageInput.focus();
    }

    async callBackend(message) {
        const response = await fetch(this.BACKEND_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({message})
        });
        const data = await response.json();
        return data.reply;
    }

    // ... остальные методы без изменений (newChat, deleteCurrentChat, renderChats, etc)
    ensureDefaultChat() {
        if (!this.chats.length) this.newChat();
        else this.currentChatId = this.chats[0].id;
    }

    newChat() {
        const chat = {id: `chat-${Date.now()}`, title: 'Новый чат', messages: [], created: new Date().toISOString()};
        this.chats.unshift(chat);
        this.currentChatId = chat.id;
        this.saveChats();
        this.renderChats();
        this.renderMessages();
    }

    deleteCurrentChat() {
        if (confirm('Удалить чат?')) {
            this.chats = this.chats.filter(c => c.id !== this.currentChatId);
            if (this.chats.length) this.currentChatId = this.chats[0].id;
            else this.newChat();
            this.saveChats();
            this.renderChats();
            this.renderMessages();
        }
    }

    addMessage(role, content, loading = false) {
        const chat = this.getCurrentChat();
        const msg = {id: Date.now().toString(), role, content, timestamp: new Date().toISOString(), loading};
        chat.messages.push(msg);
        this.saveChats();
        this.renderMessages();
        this.scrollBottom();
        return msg.id;
    }

    updateMessage(id, content) {
        const chat = this.getCurrentChat();
        const msg = chat.messages.find(m => m.id === id);
        if (msg) {
            msg.content = content;
            msg.loading = false;
            this.saveChats();
            this.renderMessages();
        }
    }

    getCurrentChat() { return this.chats.find(c => c.id === this.currentChatId) || this.newChat(); }

    renderChats() {
        document.getElementById('chatsList').innerHTML = this.chats.map(chat => {
            const last = chat.messages[chat.messages.length-1];
            return `<div class="chat-item ${chat.id===this.currentChatId?'active':''}" onclick="aiChat.switchChat('${chat.id}')">
                <i class="fas fa-comment"></i>
                <div>${chat.title}</div>
                <div style="font-size:13px;opacity:0.7">${last?last.content.slice(0,30)+'...':'Пусто'}</div>
            </div>`;
        }).join('');
    }

    renderMessages() {
        const chat = this.getCurrentChat();
        const cont = document.getElementById('messages');
        cont.innerHTML = chat.messages.length ? chat.messages.map(msg => 
            `<div class="message ${msg.role}">${msg.loading?'Думаю...':msg.content}</div>`
        ).join('') : `<div style="text-align:center;color:#888;margin-top:50px">
            <i class="fas fa-robot" style="font-size:48px;opacity:0.5"></i><p>Напиши сообщение</p></div>`;
        this.updateTitle();
    }

    switchChat(id) {
        this.currentChatId = id;
        this.renderChats();
        this.renderMessages();
        this.toggleSidebar();
    }

    updateTitle() {
        const chat = this.getCurrentChat();
        document.getElementById('chatTitle').textContent = chat.title;
        document.getElementById('chatDate').textContent = new Date(chat.created).toLocaleDateString('ru-RU');
        if (chat.title === 'Новый чат' && chat.messages[0]) {
            chat.title = chat.messages[0].content.slice(0, 30);
            this.saveChats();
        }
    }

    saveChats() { localStorage.setItem('cravt-chats', JSON.stringify(this.chats)); }
    scrollBottom() { 
        setTimeout(() => {
            document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
        }, 100);
    }
    toggleSidebar() { document.getElementById('sidebar').classList.toggle('collapsed'); }
    copyLast() {
        const chat = this.getCurrentChat();
        const lastAI = chat.messages.filter(m => m.role === 'ai').pop();
        if (lastAI) navigator.clipboard.writeText(lastAI.content);
    }
    exportChat() {
        const chat = this.getCurrentChat();
        const text = chat.messages.map(m => `${m.role==='user'?'Ты':'AI'}: ${m.content}`).join('\n\n');
        const blob = new Blob([text], {type: 'text/plain'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `cravt-chat.txt`;
        a.click();
    }
}

const aiChat = new CravtAI();
