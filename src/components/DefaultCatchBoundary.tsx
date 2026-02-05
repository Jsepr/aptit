import { type ErrorComponentProps, Link } from "@tanstack/react-router";

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
	return (
		<div className="p-2 text-2xl font-bold text-red-500">
			<p>Error: {error.message}</p>
			<Link to="/" className="text-blue-500 underline">
				Go Home
			</Link>
		</div>
	);
}
