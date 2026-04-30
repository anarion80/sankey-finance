{
  description = "Financial Results Sankey Charts Generator";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = nixpkgs.legacyPackages.${system};
    in {
      packages.default = pkgs.buildNpmPackage {
        pname = "sankey-finance";
        version = "0.0.3";

        src = ./.;

        npmDepsHash = "sha256-m69bUv8FnA2JlDmelzCyWH8GSQoxjZj2Fzq4r0mgX84=";

        # @resvg/resvg-js ships prebuilt Rust NAPI binaries for both gnu and
        # musl; on a glibc system the musl variant can't be satisfied, so we
        # ignore it rather than failing the build.
        nativeBuildInputs = with pkgs; [autoPatchelfHook];
        buildInputs = with pkgs; [stdenv.cc.cc.lib];
        # Remove the musl variant before fixup — it can't be patched on a
        # glibc system and isn't needed at runtime (Node picks the gnu one).
        preFixup = ''
          find $out -name "resvgjs.linux-x64-musl.node" -delete
        '';

        dontNpmBuild = true;

        meta = with pkgs.lib; {
          description = "Financial Results Sankey Charts Generator";
          homepage = "https://github.com/anarion80/sankey-finance";
          license = licenses.mit;
          mainProgram = "sankey-finance";
        };
      };

      apps.default = flake-utils.lib.mkApp {
        drv = self.packages.${system}.default;
      };

      devShells.default = pkgs.mkShell {
        buildInputs = with pkgs; [nodejs_22];
      };
    });
}
