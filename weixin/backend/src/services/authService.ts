async validatePassword(username: string, password: string): Promise<boolean> {
    // 确保默认密码已正确设置
    const defaultPassword = process.env.DEFAULT_PASSWORD;
    
    if (!defaultPassword) {
        throw new Error('Default password not configured');
    }
    
    // 使用 bcrypt 对比密码（如果已加密）
    // 如果是明文存储，则直接比较
    const isMatch = await bcrypt.compare(password, defaultPassword);
    
    return isMatch;
}