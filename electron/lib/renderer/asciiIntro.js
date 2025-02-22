function runAsciiIntro() {
const dataslingVersion = "0.0.19-1";

  // Define the ASCII art in a single string literal.
  const asciiArtString = `
%%############################################################*#####################################################%%%%%%%%%%%%%%%%
###################################################*+=======+++++=======+*##############################################%%%%%%%%%%%%
###############################################+====*@@@@@@@@@@%@@@@@@%#*====+###############################################%%%%%%%
###########################################*+==*%@@@@@@@@%@@%%@%@@%%@@%%#%@@%*==+*###############################################%%%
##########################*#######*+++***===#@@@%@@@%%@@@%@@%%@@@@%#@@@##@@@@@@@*==+##############################################%%
################***##**************======+@@@@@%%@@@@@@@@%@@@@@@@@@%@@@@#@@@@@%%@@#+=+*#############################################
############*************************==+@@@@@@@@@@@@%@@@@@@@#%@@@@%#@@%*%@@@@@%@@@@@%+=+****########################################
###########************************+==@@@%@@@@%%%@@@@@@@@#@@%@@@@@%%@@@##@@@@@%@@@@@@@%+=+*********#################################
#######********+++****************==#@%@@%@@@@@%%@@@%%@@@@@@#@@%@@%%@@@%%@%@@@#%@@@@@@@@%==**************##*########################
######*******+:...::-+**********+==@@@%@@@%@@@@@%@@@%@@@@#@@#@@@@@@%@@@*#@%%@@%@@@@%%@@@@@+=+******************#####################
######********-:-===+**********+=+@@@@%@@@@@@@%%%@@@%@@@@%@@#@@%@@@%@@@*%@%@@@#@@@@@%@@@@@@*=+****************************##########
####**********#######******#**+=+@%@@@=======-=#%@@@@@@@@%@@%@@@@@%%%%@##@%@@%*@@@%%%@@@%@@%%==************************************#
###***********######****##%%##==@@%@@%===+++=====*@@@@@@@@@@%@@@@@#===@%#@@@@@#@@@%%%@@%%@@%@#==************************************
#*************######***#%%%%%+=%@%%@@%===@@@@@@+==+@@%@%+====#%@#=====+++%%@%+===+#%%@@@%@@%@%#=+***********##**********************
########******##%####**#%%%%*=*@@@%@@#===@@@@@@%+==#@%===+*+===%#========%#===+*+===%@@%@@@@@%@*=+++**##***#%%%%###****************+
%%%%%%%%###############%%%%%+=%@@@@@@%===@@@@@@@*==*@@@@@@@%%==+@@#==+@@@@@@@@@@@*==+@@%@@@%@%@@==**########%%#######************+=-
%%%%%%%%%%%%%##########%%%%%=+@@@@%@@%===@@@@@@@+==*@@#=========@@#==+@@%@@#+=======+@@@@@@%@%@%*=+#########%%#######+++***********+
%%%%####%%%%%%#########%%%%#=#@@%@@@@#===@@@@@@*===%@*==+@@@%===@@#==+@%%@+==#@@@#==+@@@@@@@@%@@%==#########%%%%#####+++*******+==+*
%##%#*+*%%%%%%%########%%%%*=%@@@%@@%#===*#**====+%@@+===%%+====@@#===#@#@===%@@#===+@@%@@@%@@@@@+=*########%%%%#####***+--=+**+--=+
%%%%%%%%%%%%%%%%#######%%%%+=%@@@%@@@%=========*%@@@@%+=====#+==@@%*====+@%======*==+@@%@@@@@%@@%*=*########%%%########*+---=+******
%%%%%%%%%%%%%%%########%%%%+=%@@%%@@@%@@@@%@@@@@@@@@%%@@@@#@@@@@@@@@%#@%@@@@@@@@@@@@@@@@@@@%%@@@@*=*########%%%#################****
%%##%%%%%%%%%%%%%%%#####%%%*=%@@%%%@@%@%=======+%@%#===@%===#@%@@@%@@@@%@@%@@@@%@@@@@@@@@@@@%%@@%*=*%%####################%#####***#
%%##%%%%%%%%%%%%%%%#####%%%#=#@@@%%@@%#===%@@*===+@%===@@%#%@@%@@@%@%%%##@%@@@@@@@@@@@@@@@@@#%@@@*=*####################%%%%########
%%%%%%%%%%%%%###%%%%%%%%%%%%=+@@@%@@@%+==#@@@%@*%@@#===@@+++%@+==##+=+*%*@@@@@#***%%+++%@@@@%@@@@+=#%%%%%%%%%###%######%%%%%%#**####
@%%%%%%%%%%#####%%%%%%%%%%%%+=%@@%%@@@%=====*#%%%%%#===@@===%@+==========@@#+====+=====@@@@@%@@@@+=%%%%%%%%%%%%%%%%%####%%%%%###%%%#
@@%%%%%%%###**#%%%%%%%%%%%%%%=*@@%%@@@%@%+======+%@#===@@===%@+==*@@@#+==*@===*@@@@*===@@@@@%@@@#=+%%%%%%%%%%%%%%%%#####%%%#####%%%%
@%%%%%%%%%%%%%%%%%%%%%%%%%%%%+=%@%@@@@%%%%%%%%+===%#==+@@===%@+==%@@@%*==*%===@@@@@@===@@@@@%@@@*=#%%%%%%%%%%%%%%%%#%%%%%%%#%%%%%%%%
%%%%%%%%%%%%%##%%%%%%%#%%%%%%%==@%%@@%===*@@@@@+==##==+@@===%@+==%@@%%*==*@===%@@@@%===@@@@@@@@%=+%%%%%%%%%%##%%%%%%#######%%%%%%%%%
%%%%%%%%%*#%%##%%%%%%%%%%%%%%%#=+@@@@@#==========*@#==+@@===%@+==%@@@%*==*@#===+*#+====@@@@@%@@+=#%%%%%%%#%%%%%%%%%%####+++%%%%%%%%%
%%%%%%%#+++%%%##%%#####%%%%%%%%#=*@@@@@@@@*===+%@@@#*+*@@+==%@+==%@@@%+==#@@%%+===+%===@@@@@@@*=*%%%%%%%%%%@@%%%%%%#*++#%%%%%%%%%%%%
@@@#*#%%%@@@%%%%%%%%%%%%%@%%%%%%#=+%@@%@@@@@@@@@@%@@%%@@%@@@@%@@@@@@@%@@%@@%%#@@%@%#==+@@%@@@*=+%@@@@@@@@@@@@@@@@@%*++*#%%%%%%##%%%%
@@%*+*%%@@@@@@%%%%%%@@@@%%###%%%%#=+%@%@%@@@@@@@@%@@@@@@@@@@@@@@@@@%@@@@@@%%====++===+@@@@@@*=+@@@@@@@@@@@@@@@@@@@@%%%%@@%%%#%%##%%%
#*###%%%%%%%%%%%@%%%%@@@%%@@@%%####+=%@@%@@@@@@@@%@@@%@@@%@@@%@@@@@@@@@@%@@@@%*===+#@@@@@@@+=+%%@%@@@@@@@@@@@@@@@@%%@@@@@@%%%%%%%%%%
#*##%%%@@@@@@@@@@@@@@@@@@@@@@@%%%%%#*=*@%@@@@@@@@%@@@%@@@%@@@%%@@@@@@%@@%@@@@@@%%@@@@@@@@#==*%%%%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
%%###%%@@@@@@@@@%%%%@@@@@@%%@@@@@%####==#@@@@@@@@@@@@%@@@%@@@@@@@@@@@@@@@@@@@@%@@@@%@%@@*==%@@@@@@@@@@@@@@@%%%%%@@@@@@@@@@@@@@@@@@@@
@%%%##%%%%%%%@@@%%%%@@@@@@%%@@@@@@@@@@@#==#@@@@@@@@@@%@@@#@@@@@%@@@@@@@@%@@@@@%@@@@@@@#+=*@@@@@@@@@@@@@@@@%%%%%%%@@@@@@@@@@@@%%%%@@@
@%#####***#%%%%@@%%@@@%%%%@@@@@@@@@@@@@@@#==*%@@@@@@@@@@@%@@@@@@@@@@@@@@@@@@@@@@@@@@#==+@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%%%%@@%%
@@@@@@%%##%%%#%%@@@@@@@@@@@@@@@@@@@@@@@@@@@%+=+*%@@@@@@@@@@@@@@@@@@@@%@@@@@@@@@@@%+==*%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%
@@@@@@@@@@@@@@@@@%%%%%%%%#%%%%%%%%%%%%%%%%%%%@#+==+#@@@@@@@@@@@@@@@@@%@@@@@@@@#+==+%%%%%@@@@@%@@@@@@@%@@%%%%%%%@@@@@@@@@@@@@@@@@@@@@
%%%%@@@%%%%%%##%%%%%%@%%%%%%%%%%%%%%@@@%%%%%%%%%%%*+==++##@@@@@@@@@@@%@@%#*+==+*%@@@@@@%%@@@%@@%@%%%%%%@@@@%@@@@@@@@@@@@@%%@@@%@%%@@
#%%@@%%%%%%%%%#@%%@%%%%@%%@@@@@@@@@%@%%%%%%#%%%@%@%%@%%++========+=++++++++#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%@@@@@@@@@@@@@@@@@
%%%@%%%@%%%%%#*#%%%%%%@%@@#%%@@@@@@@@@@%%@@@@@@@%%@%%%%%#%@@@@@%%%@@@@@@@@@@@%@@@@%@@@@@@@@@@%%@@@%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%%
                                                        Version: ${dataslingVersion}
                                    ╔╗ ┬ ┬  ╦═╗┬ ┬┌─┐┌┐┌  ╔═╗┌─┐┬─┐┌─┐┬─┐┌┬┐  ╦ ╦┬┬  ┌─┐┌─┐┌┐┌
                                    ╠╩╗└┬┘  ╠╦╝└┬┘├─┤│││  ║ ╦├┤ ├┬┘├─┤├┬┘ ││  ║║║││  └─┐│ ││││
                                    ╚═╝ ┴   ╩╚═ ┴ ┴ ┴┘└┘  ╚═╝└─┘┴└─┴ ┴┴└──┴┘  ╚╩╝┴┴─┘└─┘└─┘┘└┘
 
  `; // .trim() removes the extra newline at the start/end

  // Split the string into an array of lines using newline characters.
  const asciiArt = asciiArtString.split("\n");

  // Create a full-screen container for the ASCII art.
  const artContainer = document.createElement("div");
  artContainer.id = "ascii-art-container";
  Object.assign(artContainer.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    backgroundColor: "black",
    color: "lime", // Set your text color here
    fontFamily: "monospace",
    whiteSpace: "pre",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    zIndex: "10000", // Ensure it's on top
  });
  document.body.appendChild(artContainer);

  // Create an inner container for the lines.
  const linesContainer = document.createElement("div");
  artContainer.appendChild(linesContainer);

  // Function to print out each line one-by-one.
  let currentLine = 0;
  const lineDelay = 50; // Delay in milliseconds between lines

  const timer = setInterval(() => {
    if (currentLine < asciiArt.length) {
      const lineElement = document.createElement("div");
      lineElement.textContent = asciiArt[currentLine];
      linesContainer.appendChild(lineElement);
      currentLine++;
    } else {
      clearInterval(timer);
      // Pause before fading out the ASCII intro.
      setTimeout(() => {
        artContainer.style.transition = "opacity 1s";
        artContainer.style.opacity = "0";
        setTimeout(() => {
          if (artContainer.parentNode) {
            artContainer.parentNode.removeChild(artContainer);
          }
        }, 1000);
      }, 1000);
    }
  }, lineDelay);
}

module.exports = { runAsciiIntro };
