import { Router, Request, Response } from 'express';

export const strapiRouter = Router();

// Save blog post as draft to Strapi
strapiRouter.post('/publish', async (req: Request, res: Response) => {
  try {
    const strapiUrl = req.body.strapiUrl || process.env.STRAPI_URL || 'http://localhost:1337';
    const strapiToken = (req.headers['x-strapi-token'] as string) || process.env.STRAPI_API_TOKEN;

    if (!strapiToken) {
      res.status(400).json({ error: 'Strapi API token is required' });
      return;
    }

    const {
      title,
      content,
      metaTitle,
      metaDescription,
      metaImage,
      ogTitle,
      ogDescription,
      ogImage,
      ogUrl,
      ogType = 'article',
      excerpt,
      slug,
      author = 'System',
      category = 'Product updates',
      mainKeyword,
      secondaryKeywords,
      keywords,
      publish = false,
      contentType = 'blog-posts',  // Strapi collection slug (/api/blog-posts)
    } = req.body;

    // Build the payload for Strapi with required fields
    const payload: any = {
      data: {
        title: title || 'Untitled',
        content: content || '',
        slug: slug || title?.toLowerCase().replace(/\s+/g, '-') || 'untitled',
        excerpt: excerpt || content?.substring(0, 160) || '',
        author: author,
        category: category,
        metaDescription: metaDescription || excerpt || content?.substring(0, 160) || '',
        // In Strapi v5, status is controlled via query param, not publishedAt in data
        // SEO section with metaTitle, metaDescription, metaImage, keywords
        seo: {
          metaTitle: metaTitle || title || '',
          metaDescription: metaDescription || excerpt || content?.substring(0, 160) || '',
          metaImage: metaImage || null,
          keywords: keywords && keywords.length > 0 ? (Array.isArray(keywords) ? keywords.join(', ') : keywords) : '',
          // openGraph as nested component inside SEO
          openGraph: {
            ogTitle: ogTitle || title || '',
            ogDescription: ogDescription || metaDescription || excerpt || '',
            ogImage: ogImage || null,
            ogUrl: ogUrl || null,
            ogType: 'article',
          },
        },
      },
    };

    // Add optional fields (only if Strapi schema supports them)
    // Remove unsupported fields like metaTitle, ogTitle, ogDescription, ogImage, ogUrl, ogType, mainKeyword, secondaryKeywords

    const statusQuery = publish ? '?status=published' : '?status=draft';
    const response = await fetch(`${strapiUrl}/api/${contentType}${statusQuery}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${strapiToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `Strapi returned ${response.status}`);
    }

    const result = await response.json();

    res.json({
      success: true,
      message: 'Blog saved as draft in Strapi',
      strapiId: result.data?.id,
      documentId: result.data?.documentId,
    });
  } catch (error: any) {
    console.error('Strapi error:', error);
    res.status(500).json({ error: error.message || 'Failed to save to Strapi' });
  }
});

// Fetch existing drafts from Strapi
strapiRouter.get('/drafts', async (req: Request, res: Response) => {
  try {
    const strapiUrl = (req.query.strapiUrl as string) || process.env.STRAPI_URL || 'http://localhost:1337';
    const strapiToken = (req.headers['x-strapi-token'] as string) || process.env.STRAPI_API_TOKEN;
    const contentType = (req.query.contentType as string) || 'blog-posts';

    if (!strapiToken) {
      res.status(400).json({ error: 'Strapi API token is required' });
      return;
    }

    const response = await fetch(
      `${strapiUrl}/api/${contentType}?status=draft&sort=createdAt:desc&pagination[pageSize]=25`,
      {
        headers: {
          'Authorization': `Bearer ${strapiToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Strapi returned ${response.status}`);
    }

    const result = await response.json();

    res.json({
      success: true,
      drafts: result.data || [],
      total: result.meta?.pagination?.total || 0,
    });
  } catch (error: any) {
    console.error('Strapi fetch error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch drafts from Strapi' });
  }
});

// Test Strapi connection
strapiRouter.post('/test', async (req: Request, res: Response) => {
  try {
    const { strapiUrl, apiToken } = req.body;

    const response = await fetch(`${strapiUrl}/api/content-type-builder/content-types`, {
      headers: { 'Authorization': `Bearer ${apiToken}` },
    });

    if (response.ok) {
      res.json({ success: true, message: 'Strapi connected successfully' });
    } else {
      // Try a simpler endpoint
      const healthResponse = await fetch(`${strapiUrl}/_health`);
      if (healthResponse.ok) {
        res.json({ success: true, message: 'Strapi server reachable (check API token permissions)' });
      } else {
        throw new Error('Cannot reach Strapi server');
      }
    }
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});
