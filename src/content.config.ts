import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { parseDateInSiteTimezone, reinterpretUtcAsTimezone } from './lib/date';

/**
 * Custom date schema that parses date strings in the site's configured timezone.
 * This ensures consistent date handling regardless of build environment.
 */
const dateInSiteTimezone = z
  .string()
  .or(z.date())
  .transform((val) => {
    if (val instanceof Date) {
      // gray-matter has already parsed the date string as UTC, but user intended site timezone.
      // Reinterpret the UTC values as site timezone to get correct timestamp.
      return reinterpretUtcAsTimezone(val);
    }
    return parseDateInSiteTimezone(val);
  });

const blogCollection = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) => z.preprocess(
    (input: any) => {
      if (input && typeof input === 'object') {
        // Fallback pubDate -> date
        if (input.date === undefined && input.pubDate !== undefined) {
          input.date = input.pubDate;
        }
        // Fallback updatedDate -> updated
        if (input.updated === undefined && input.updatedDate !== undefined) {
          input.updated = input.updatedDate;
        }
        // Fallback heroImage -> cover
        if (input.cover === undefined && input.heroImage !== undefined) {
          input.cover = input.heroImage;
        }
      }
      return input;
    },
    z.object({
      title: z.string(),
      description: z.string().optional(),
      link: z.string().optional(),
      date: dateInSiteTimezone,
      updated: dateInSiteTimezone.optional(),
      cover: image().or(z.string()).optional().transform((val) => {
        if (val && typeof val === 'object' && 'src' in val) {
          return val.src;
        }
        return val;
      }),
      tags: z.array(z.string()).optional(),
      subtitle: z.string().optional(),
      catalog: z.boolean().optional().default(true),
      categories: z
        .array(z.string())
        .or(z.array(z.array(z.string())))
        .optional(),
      sticky: z.boolean().optional(),
      draft: z.boolean().optional(),
      tocNumbering: z.boolean().optional().default(true),
      excludeFromSummary: z.boolean().optional(),
      math: z.boolean().optional(),
      quiz: z.boolean().optional(),
      password: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      // 文章朗读（Edge TTS 预生成音频）：audio: true 时构建脚本会生成 mp3 并接入播放器；
      // audioVoice 可选，覆盖默认朗读音色（如 zh-CN-YunxiNeural）。
      audio: z.boolean().optional(),
      audioVoice: z.string().optional(),
    })
  ),
});

export const collections = {
  blog: blogCollection,
};
