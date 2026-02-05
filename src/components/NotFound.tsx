import { Link } from "@tanstack/react-router";

export function NotFound() {
	return (
		<div className="p-2 text-2xl font-bold">
			<p>Page Not Found</p>
			<Link to="/" className="text-blue-500 underline">
				Go Home
			</Link>
		</div>
	);
}
