import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";

async function updateColumn(
  id: string,
  data: {
    name?: string;
    icon?: string | null;
    color?: string | null;
    isFinal?: boolean;
  },
) {
  const response = await client.column[":id"].$put({
    param: { id },
    json: data,
  });

  return unwrapResponse(response);
}

export default updateColumn;
