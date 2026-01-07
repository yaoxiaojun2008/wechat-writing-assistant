app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // 验证用户名和密码
        const isValid = await authService.validatePassword(username, password);
        
        if (!isValid) {
            // 返回更详细的错误信息
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Invalid credentials. Please check your username and password.'
                }
            });
        }
        
        // 创建会话
        const sessionId = await authService.createSession(username);
        
        res.json({
            success: true,
            data: {
                user: { username },
                sessionId
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error'
            }
        });
    }
});