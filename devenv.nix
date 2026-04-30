{ pkgs, ... }:

{
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_22;
    npm.enable = true;
  };

  tasks."npm:install" = {
    description = "Install npm dependencies";
    exec = "npm install";
    before = [ "devenv:enterShell" ];
  };
}
