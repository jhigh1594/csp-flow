import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";

async function deleteColumn(id: string) {
  const response = await client.column[":id"].$delete({
    param: { id },
  });

  return unwrapResponse(response);
}

export default deleteColumn;
