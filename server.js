const net = require('net');
const readline = require('readline');
const port = 3000;

// Danh sách các kết nối client
const clients = [];

// Tạo server TCP
const server = net.createServer((socket) => {
    const rl = readline.createInterface({
        input: socket,
        output: socket
    });

    let clientName = `${socket.remoteAddress}`; // Mặc định là IP, sẽ thay đổi sau khi người dùng nhập tên
    let clientID = `${socket.remoteAddress}`
    // Yêu cầu người dùng nhập tên
    rl.question('Enter your name: ', (name) => {
        clientName = name || clientName; // Nếu không nhập tên, sẽ dùng địa chỉ IP làm tên
        console.log(`Client ${clientName} connected`);

        // Gửi tin nhắn chào mừng
        const welcomeMessage = `
|-------------------------------------------|
| Welcome to the Chat Server!               |
|-------------------------------------------|
| Type your message and press Enter to send.|
| Type "exit" to disconnect.                |
|-------------------------------------------|
`.replace(/\n/g, '\r\n');

        // Gửi toàn bộ thông điệp một lần
        socket.write(welcomeMessage);

        // Thêm client vào danh sách
        clients.push({ socket, name: clientName, ID: clientID });

        // Thông báo cho toàn bộ client về người mới
        clients.forEach((client) => {
            if (client.socket !== socket) {
                const joinMessage = `
|----------------------------------------|
 ${clientName} has joined the chat!
|----------------------------------------|\r\n`.replace(/\n/g, '\r\n');
                client.socket.write(joinMessage); // Gửi tin nhắn cho tất cả client khác
            }
        });

        // Biến chứa dữ liệu tin nhắn chưa hoàn chỉnh
        let buffer = '';

        // Xử lý dữ liệu nhận từ client
        socket.on('data', (data) => {
            const input = data.toString();

            // Xử lý phím Backspace
            if (input === '\b' || input === '\x7f') { // Phím Backspace (mã ASCII 8 hoặc 127)
                if (buffer.length > 0) {
                    // Xóa ký tự cuối cùng trong buffer
                    buffer = buffer.slice(0, -1);
                    // Xóa ký tự trên terminal (quay lại 1 bước, ghi ký tự trống, và quay lại 1 bước nữa)
                    socket.write('\b \b');
                }
            } else {
                buffer += input; // Thêm ký tự vào buffer
            }

            // Kiểm tra xem buffer có chứa dấu \n hay không
            let messages = buffer.split('\n');  // Tách các tin nhắn nếu có dấu \n

            // Duyệt qua tất cả tin nhắn nhận được
            messages.forEach((message, index) => {
                if (index === messages.length - 1) {
                    // Nếu là tin nhắn cuối cùng chưa có \n, giữ lại phần chưa hoàn chỉnh
                    buffer = message;
                } else {
                    // Nếu có đầy đủ tin nhắn (tách ra từ dấu \n)
                    message = message.trim();
                    if (message) {
                        console.log(`Message from ${clientName}: ${message}`);

                        // Nếu người dùng nhập "exit", ngắt kết nối
                        if (message.toLowerCase() === 'exit') {
                            socket.end();
                        }
                        if (message == "/showPeople()") {
                            clients.forEach((user) => {
                                socket.write(user['ID'] + " " + user['name'] + "\r\n");
                            })
                        } else {
                            // Phát tin nhắn đến tất cả client khác theo định dạng tên: message
                            clients.forEach((client) => {
                                if (client.socket !== socket) {
                                    const formattedMessage = `${clientName}: ${message}\r\n`; // Đảm bảo mỗi tin nhắn có \r\n
                                    client.socket.write(formattedMessage); // Gửi tin nhắn cho tất cả client khác
                                }
                            });
                        }

                    }
                }
            });
        });


        // Xử lý khi client ngắt kết nối
        socket.on('end', () => {
            console.log(`Client disconnected: ${clientName}`);
            const index = clients.findIndex(client => client.socket === socket);
            if (index !== -1) clients.splice(index, 1);

            // Thông báo cho tất cả client về việc client đã thoát
            clients.forEach((client) => {
                const leaveMessage = `${clientName} has left the chat!\r\n`;
                client.socket.write(leaveMessage); // Gửi tin nhắn cho tất cả client khác
            });
        });

        // Xử lý lỗi
        socket.on('error', (err) => {
            console.error(`Error with client ${clientName}: ${err.message}`);
        });
    });
});

// Hàm lấy IP nội bộ
const dgram = require('dgram');
function getLocalIp() {
    const socket = dgram.createSocket('udp4');
    return new Promise((resolve, reject) => {
        socket.connect(80, '1.1.1.1', () => {
            const localIp = socket.address().address;
            socket.close();
            resolve(localIp);
        });

        socket.on('error', (err) => {
            socket.close();
            reject(err);
        });
    });
}

// Lắng nghe trên cổng 3000
getLocalIp()
    .then((localIp) => {
        server.listen(port, localIp, () => {
            console.log(`Server is running on http://${localIp}:${port}`);
        });
    })
    .catch((error) => {
        console.log("Check IP error: " + error);
        server.listen(port, 'localhost', () => {
            console.log(`Server is running on http://localhost:${port}`);
        });
    });
