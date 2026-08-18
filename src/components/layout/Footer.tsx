import { ExternalLink } from "lucide-react";

export function Footer() {
	return (
		<footer className="bg-background">
			<div className="container mx-auto flex flex-col items-center gap-2 px-4 py-6">
				<p className="text-center text-sm text-muted-foreground">
					{/* &copy; {new Date().getFullYear()} DevLeague. All rights reserved. */}
					Office football team management — plan games, build balanced teams, and track match stats.
				</p>
				<a href="https://github.com/nur-alam/ollyofc/" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-[#101d56] hover:text-[#101d56]">
					<ExternalLink className="inline h-4 w-4" />&nbsp;
					Repo
				</a>
			</div>
		</footer>
	);
}