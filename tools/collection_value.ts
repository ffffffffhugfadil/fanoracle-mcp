import { getComicCount, addComic, getComicById } from "../casper.js";
import { fetchComicPrice } from "./fetch_comic_price.js";

interface Comic {
  title: string;
  issue_number: string;
  grade?: string;
  is_key?: boolean;
}

interface CollectionValueResult {
  action: string;
  comic_count_on_chain?: number;
  deploy_hash?: string;
  total_estimated_value?: number;
  currency?: string;
  breakdown?: {
    title: string;
    issue_number: string;
    grade?: string;
    is_key?: boolean;
    estimated_value: number;
  }[];
  error?: string;
}

export async function collectionValue(params: {
  action: "get_count" | "add_comic" | "value_estimate";
  comics?: Comic[];
}): Promise<CollectionValueResult> {
  const { action, comics } = params;

  switch (action) {
    case "get_count": {
      const count = await getComicCount();
      return { action: "get_count", comic_count_on_chain: count };
    }

    case "add_comic": {
      if (!comics || comics.length === 0) {
        return { action: "add_comic", error: "Provide at least one comic to add" };
      }
      const comic = comics[0];
      const gradeX10 = Math.round(parseFloat(comic.grade ?? "0") * 10);
      const priceResult = await fetchComicPrice({
        title: comic.title,
        issue_number: comic.issue_number,
        grade: comic.grade,
      });
      const valueCents = Math.round(priceResult.price_avg * 100);
      const deployHash = await addComic(
        comic.title,
        comic.issue_number,
        gradeX10,
        comic.is_key ?? false,
        valueCents
      );
      return {
        action: "add_comic",
        deploy_hash: deployHash,
        total_estimated_value: priceResult.price_avg,
        currency: "USD",
        breakdown: [{
          title: comic.title,
          issue_number: comic.issue_number,
          grade: comic.grade,
          is_key: comic.is_key,
          estimated_value: priceResult.price_avg,
        }],
      };
    }

    case "value_estimate": {
      if (!comics || comics.length === 0) {
        return { action: "value_estimate", error: "Provide a list of comics to estimate value" };
      }

      const chunks: Comic[][] = [];
      for (let i = 0; i < comics.length; i += 5) {
        chunks.push(comics.slice(i, i + 5));
      }

      const breakdown: CollectionValueResult["breakdown"] = [];

      for (const chunk of chunks) {
        const results = await Promise.allSettled(
          chunk.map((comic) =>
            fetchComicPrice({
              title: comic.title,
              issue_number: comic.issue_number,
              grade: comic.grade,
            })
          )
        );

        for (let i = 0; i < chunk.length; i++) {
          const comic = chunk[i];
          const result = results[i];
          breakdown.push({
            title: comic.title,
            issue_number: comic.issue_number,
            grade: comic.grade,
            is_key: comic.is_key,
            estimated_value: result.status === "fulfilled" ? result.value.price_avg : 0,
          });
        }
      }

      const total = breakdown.reduce((sum, c) => sum + c.estimated_value, 0);
      return {
        action: "value_estimate",
        total_estimated_value: parseFloat(total.toFixed(2)),
        currency: "USD",
        breakdown,
      };
    }

    default:
      return { action, error: "Unknown action" };
  }
}
