import type { MouseEvent } from "react";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type PageItem = number | "ellipsis";

export function ListPagination({
  page,
  pageCount,
  onPageChange,
  hrefForPage,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  hrefForPage: (page: number) => string;
}) {
  if (pageCount <= 1) {
    return null;
  }

  const items = getPageItems(page, pageCount);

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={hrefForPage(page - 1)}
            aria-disabled={page <= 1}
            tabIndex={page <= 1 ? -1 : undefined}
            className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
            onClick={(event) => openPage(event, page - 1, page > 1, onPageChange)}
          />
        </PaginationItem>
        {items.map((item, index) =>
          item === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={item}>
              <PaginationLink
                href={hrefForPage(item)}
                isActive={item === page}
                onClick={(event) => openPage(event, item, item !== page, onPageChange)}
              >
                {item}
              </PaginationLink>
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          <PaginationNext
            href={hrefForPage(page + 1)}
            aria-disabled={page >= pageCount}
            tabIndex={page >= pageCount ? -1 : undefined}
            className={page >= pageCount ? "pointer-events-none opacity-50" : undefined}
            onClick={(event) =>
              openPage(event, page + 1, page < pageCount, onPageChange)
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

function openPage(
  event: MouseEvent<HTMLAnchorElement>,
  nextPage: number,
  enabled: boolean,
  onPageChange: (page: number) => void,
) {
  if (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  ) {
    return;
  }

  event.preventDefault();

  if (enabled) {
    onPageChange(nextPage);
  }
}

function getPageItems(page: number, pageCount: number): PageItem[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, pageCount]);

  for (let cursor = page - 1; cursor <= page + 1; cursor += 1) {
    if (cursor > 1 && cursor < pageCount) {
      pages.add(cursor);
    }
  }

  if (page <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }

  if (page >= pageCount - 2) {
    pages.add(pageCount - 1);
    pages.add(pageCount - 2);
    pages.add(pageCount - 3);
  }

  const sorted = [...pages].sort((left, right) => left - right);
  const items: PageItem[] = [];

  for (const value of sorted) {
    const previous = items.at(-1);

    if (typeof previous === "number" && value - previous > 1) {
      items.push("ellipsis");
    }

    items.push(value);
  }

  return items;
}
