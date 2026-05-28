import * as core from "@actions/core";

export interface ActionInputs {
  token: string;
  owner: string;
  packageName: string;
  tags: string[];
}

export function readInputs(): ActionInputs {
  const token = core.getInput("token", { required: true });
  const owner = core.getInput("owner", { required: true });
  const packageName = core.getInput("package", { required: true });
  const tags = core
    .getMultilineInput("tags", { required: true, trimWhitespace: true })
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  if (tags.length === 0) {
    throw new Error("input 'tags' must include at least one non-empty line");
  }

  return {
    token,
    owner,
    packageName,
    tags
  };
}
