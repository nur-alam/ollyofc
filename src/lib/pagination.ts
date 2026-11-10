import { useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

export function usePagination({
  itemCount,
  pageSize,
  ready = true,
  pageParam = "page",
}: {
  itemCount: number;
  pageSize: number;
  ready?: boolean;
  pageParam?: string;
}) {
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const pageCount = Math.max(1, Math.ceil(itemCount / pageSize));
  const page = clampPage(searchParams.get(pageParam), pageCount);
  const start = (page - 1) * pageSize;

  useEffect(() => {
    if (!ready) {
      return;
    }

    const raw = searchParams.get(pageParam);
    const canonical = page <= 1 ? null : String(page);

    if (raw === canonical) {
      return;
    }

    setSearchParams(
      (current) => writePageParam(current, pageParam, canonical),
      { replace: true },
    );
  }, [page, pageParam, ready, searchParams, setSearchParams]);

  const goToPage = (nextPage: number) => {
    const canonical = nextPage <= 1 ? null : String(nextPage);

    setSearchParams((current) => writePageParam(current, pageParam, canonical));
    window.scrollTo(0, 0);
  };

  const pageHref = (nextPage: number) => {
    const params = writePageParam(searchParams, pageParam, nextPage <= 1 ? null : String(nextPage));
    const query = params.toString();

    return query ? `${pathname}?${query}` : pathname;
  };

  return { page, pageCount, pageSize, start, goToPage, pageHref };
}

function writePageParam(
  current: URLSearchParams,
  pageParam: string,
  canonical: string | null,
) {
  const next = new URLSearchParams(current);

  if (canonical == null) {
    next.delete(pageParam);
  } else {
    next.set(pageParam, canonical);
  }

  return next;
}

function clampPage(rawPage: string | null, pageCount: number) {
  const parsed = Number.parseInt(rawPage ?? "1", 10);

  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.min(Math.max(parsed, 1), pageCount);
}
