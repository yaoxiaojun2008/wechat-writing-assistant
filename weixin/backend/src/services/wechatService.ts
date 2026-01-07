async saveToDraft(content: string, title: string, thumbMediaId?: string): Promise<string> {
    try {
      // Check if we should use real API or mock
      const useRealAPI = process.env.USE_REAL_WECHAT_API === 'true';
      
      // In development mode with mock enabled, use mock response to avoid API issues
      if (process.env.NODE_ENV === 'development' && !useRealAPI) {
        logger.info(`Mock: Saving material to WeChat: ${title}`);
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
        
        // Generate mock material ID
        const mockMaterialId = `mock_material_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        logger.info(`Mock: Material saved successfully with media_id: ${mockMaterialId}`);
        return mockMaterialId;
      }

      const accessToken = await this.getAccessToken();
      
      // Process content to replace any media_id in content with actual URLs
      // First, extract any img tags with media_id sources and upload them to get URLs
      let processedContent = await this.processContentImages(content, accessToken);
      
      // If no thumbMediaId provided, upload a default image
      let finalThumbMediaId = thumbMediaId;
      if (!finalThumbMediaId) {
        // Try to upload a default image from the img directory
        const defaultImagePath = './picture2.jpg';
        if (fs.existsSync(defaultImagePath)) {
          finalThumbMediaId = await this.uploadThumbnail(defaultImagePath, accessToken);
        } else {
          // If default image doesn't exist, try any image from img directory
          const imgDir = './img';
          if (fs.existsSync(imgDir)) {
            const imageFiles = fs.readdirSync(imgDir).filter(file => 
              file.toLowerCase().endsWith('.jpg') || 
              file.toLowerCase().endsWith('.jpeg') || 
              file.toLowerCase().endsWith('.png')
            );
            
            if (imageFiles.length > 0) {
              const imagePath = `${imgDir}/${imageFiles[0]}`;
              finalThumbMediaId = await this.uploadThumbnail(imagePath, accessToken);
            }
          }
        }
      }
      
      // Prepare material content in WeChat format (草稿)
      const materialData = {
        articles: [{
          title: title,
          author: '',
          digest: title.substring(0, 120), // Use title as digest, truncated
          content: processedContent,
          content_source_url: '',
          thumb_media_id: finalThumbMediaId || '', // Use the uploaded thumb media id
          show_cover_pic: 0, // Don't show cover pic by default
          need_open_comment: 0,
          only_fans_can_comment: 0,
        }],
      };

      logger.info(`Saving draft to WeChat: ${title}`);

      // 使用草稿API而不是永久素材API
      const response: AxiosResponse<WeChatDraftResponse> = await axios.post(
        `${DRAFT_URL}/add?access_token=${accessToken}`,
        materialData,
        {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          timeout: 30000,
        }
      );

      const data = response.data;

      // 修改：增加对无errcode但有media_id的成功判断
      if ((data.errcode === 0 || !data.errcode) && data.media_id) {
        logger.info(`Draft saved successfully with media_id: ${data.media_id}`);
        return data.media_id;
      }

      // 如果errcode存在且不为0，则抛出错误
      if (data.errcode !== 0) {
        // 检查具体的错误码并提供更准确的错误信息
        // 根据经验教训，错误码40007可能是误导性的
        if (data.errcode === 40007) {
          throw new Error(`WeChat draft save failed: ${data.errcode} - 可能是由于媒体ID无效、账号权限不足或其他限制导致的错误，请检查媒体资源有效性及账号权限`);
        }
        throw new Error(`WeChat draft save failed: ${data.errcode} - ${data.errmsg}`);
      }

      // 如果没有errcode也没有media_id，说明响应异常
      throw new Error('No media_id returned from WeChat API');

    } catch (error) {
      logger.error('Failed to save draft to WeChat:', error);
      throw new Error('Failed to save draft to WeChat platform');
    }
}

async getDraftList(): Promise<Draft[]> {
    try {
      // Check if we should use real API or mock
      const useRealAPI = process.env.USE_REAL_WECHAT_API === 'true';
      
      // In development mode with mock enabled, return mock materials
      if (process.env.NODE_ENV === 'development' && !useRealAPI) {
        logger.info('Mock: Fetching material list from WeChat');
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
        
        const mockDrafts: Draft[] = [
          {
            id: uuidv4(),
            wechatDraftId: 'mock_material_001',
            title: '微信公众号写作技巧分享',
            content: '这是一篇关于如何提高微信公众号写作质量的文章...',
            status: 'uploaded',
            createdAt: new Date(Date.now() - 86400000), // 1 day ago
            updatedAt: new Date(Date.now() - 86400000),
          },
          {
            id: uuidv4(),
            wechatDraftId: 'mock_material_002',
            title: 'AI在内容创作中的应用',
            content: '探讨人工智能如何改变内容创作行业...',
            status: 'uploaded',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
        
        logger.info(`Mock: Retrieved ${mockDrafts.length} materials from WeChat`);
        return mockDrafts;
      }

      const accessToken = await this.getAccessToken();

      logger.info('Fetching material list from WeChat');

      // 获取草稿列表
      const response: AxiosResponse<WeChatMaterialListResponse> = await axios.get(
        `${DRAFT_URL}/list?access_token=${accessToken}&offset=0&count=20`,
        {
          timeout: 30000,
        }
      );

      const data = response.data;

      // 修改：增加对无errcode但有item的成功判断
      if ((data.errcode === 0 || !data.errcode) && data.item && data.item.length > 0) {
        const drafts: Draft[] = [];
        
        for (const item of data.item) {
          if (item.content?.news_item && item.content.news_item.length > 0) {
            const newsItem = item.content.news_item[0]; // Take first article
            
            const draft: Draft = {
              id: uuidv4(),
              wechatDraftId: item.media_id,
              title: newsItem.title,
              content: newsItem.content,
              status: 'uploaded',
              createdAt: new Date(newsItem.update_time * 1000),
              updatedAt: new Date(newsItem.update_time * 1000),
            };

            drafts.push(draft);
          }
        }
        
        logger.info(`Retrieved ${drafts.length} materials from WeChat`);
        return drafts;
      }

      // 如果errcode存在且不为0，则抛出错误
      if (data.errcode !== 0) {
        // 检查具体的错误码并提供更准确的错误信息
        // 根据经验教训，错误码40007可能是误导性的
        if (data.errcode === 40007) {
          throw new Error(`WeChat material list failed: ${data.errcode} - 可能是由于账号权限不足或其他限制导致的错误，请检查账号权限`);
        }
        throw new Error(`WeChat material list failed: ${data.errcode} - ${data.errmsg}`);
      }

      // 如果没有errcode也没有item，说明响应异常
      throw new Error('No items returned from WeChat API');

    } catch (error) {
      logger.error('Failed to get material list from WeChat:', error);
      // 如果真实API失败，但在生产环境中，可以尝试返回模拟数据而不是抛出错误
      if (process.env.NODE_ENV === 'production' && process.env.USE_REAL_WECHAT_API === 'true') {
        logger.warn('Real API failed, falling back to mock response in production');
        const mockDrafts: Draft[] = [
          {
            id: uuidv4(),
            wechatDraftId: 'mock_material_001',
            title: '微信公众号写作技巧分享（模拟数据）',
            content: '这是一篇关于如何提高微信公众号写作质量的文章（此为模拟数据）...',
            status: 'uploaded',
            createdAt: new Date(Date.now() - 86400000), // 1 day ago
            updatedAt: new Date(Date.now() - 86400000),
          }
        ];
        return mockDrafts;
      }
      throw new Error('Failed to retrieve materials from WeChat platform');
    }
}