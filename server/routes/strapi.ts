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
      ogTitle,
      ogDescription,
      excerpt,
      slug,
      mainKeyword,
      secondaryKeywords,
      contentType = 'articles',  // Strapi collection type name
    } = req.body;

    // Build the payload for Strapi
    const payload: any = {
      data: {
        title,
        content,
        slug,
        excerpt,
        publishedAt: null, // null = draft status
      },
    };

    // Add SEO fields if the content type supports them
    if (metaTitle || metaDescription) {
      payload.data.seo = {
        metaTitle,
        metaDescription,
        shareImage: null,
      };
    }

    // Add meta fields directly if content type has them as top-level fields
    if (metaTitle) payload.data.metaTitle = metaTitle;
    if (metaDescription) payload.data.metaDescription = metaDescription;
    if (ogTitle) payload.data.ogTitle = ogTitle;
    if (ogDescription) payload.data.ogDescription = ogDescription;
    if (mainKeyword) payload.data.mainKeyword = mainKeyword;
    if (secondaryKeywords) payload.data.secondaryKeywords = Array.isArray(secondaryKeywords) ? secondaryKeywords.join(', ') : secondaryKeywords;

    const response = await fetch(`${strapiUrl}/api/${contentType}`, {
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
    const contentType = (req.query.contentType as string) || 'articles';

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
