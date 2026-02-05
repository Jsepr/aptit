export const seo = ({
	title,
	description,
}: {
	title: string;
	description?: string;
}) => {
	return [{ title }, { name: "description", content: description }];
};
